using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;

namespace Ralphy.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<Post> Posts => Set<Post>();
        public DbSet<Photo> Photos => Set<Photo>();
        public DbSet<Comment> Comments => Set<Comment>();
        public DbSet<Location> Locations => Set<Location>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<PostTag> PostTags => Set<PostTag>();
        public DbSet<AboutProfile> AboutProfiles => Set<AboutProfile>();
        public DbSet<WorkExperience> WorkExperiences => Set<WorkExperience>();
        public DbSet<Skill> Skills => Set<Skill>();
        public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
        public DbSet<WorkUser> WorkUsers { get; set; }
        public DbSet<TimeLog> TimeLogs { get; set; }
        public DbSet<Project> Projects => Set<Project>();
        public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
        public DbSet<WorkItem> WorkItems => Set<WorkItem>();
        public DbSet<Label> Labels => Set<Label>();
        public DbSet<WorkItemLabel> WorkItemLabels => Set<WorkItemLabel>();
        public DbSet<Milestone> Milestones => Set<Milestone>();
        public DbSet<PersonalAccessToken> PersonalAccessTokens => Set<PersonalAccessToken>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // PostTag composite primary key
            modelBuilder.Entity<PostTag>()
                .HasKey(pt => new { pt.PostId, pt.TagId });

            // PostTag relationships
            modelBuilder.Entity<PostTag>()
                .HasOne(pt => pt.Post)
                .WithMany(p => p.PostTags)
                .HasForeignKey(pt => pt.PostId);

            modelBuilder.Entity<PostTag>()
                .HasOne(pt => pt.Tag)
                .WithMany(t => t.PostTags)
                .HasForeignKey(pt => pt.TagId);

            // User relationships
            // Deleting a user must not silently take their posts with it.
            modelBuilder.Entity<User>()
                .HasMany(u => u.Posts)
                .WithOne(p => p.User)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Location relationships
            // Restrict, not Cascade: a Location is shared by many posts, so
            // deleting a place must never cascade-delete everything pinned to it.
            modelBuilder.Entity<Location>()
                .HasMany(l => l.Posts)
                .WithOne(p => p.Location)
                .HasForeignKey(p => p.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Post relationships
            modelBuilder.Entity<Post>()
                .HasMany(p => p.Photos)
                .WithOne(ph => ph.Post)
                .HasForeignKey(ph => ph.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            // Gallery reads always sort on this pair.
            modelBuilder.Entity<Photo>()
                .HasIndex(p => new { p.PostId, p.SortOrder });

            modelBuilder.Entity<Post>()
                .HasMany(p => p.Comments)
                .WithOne(c => c.Post)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<Tag>()
                .HasIndex(t => t.Name)
                .IsUnique();

            // Enum conversions
            modelBuilder.Entity<Post>()
                .Property(p => p.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Photo>()
                .Property(p => p.Type)
                .HasConversion<string>();

            // WorkUser
            modelBuilder.Entity<WorkUser>(entity =>
            {
                // The class was renamed TimekeepingUser -> WorkUser; the physical
                // table deliberately was not. Pinning it here keeps the rename a
                // source-only change with zero migration risk against Railway.
                // Index names derive from this, so IX_TimekeepingUsers_* also stand.
                entity.ToTable("TimekeepingUsers");

                entity.HasKey(u => u.Id);

                entity.Property(u => u.PublicId)
                    .IsRequired()
                    .HasDefaultValueSql("gen_random_uuid()");

                entity.HasIndex(u => u.PublicId)
                    .IsUnique();

                entity.Property(u => u.Username)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.HasIndex(u => u.Username)
                    .IsUnique();

                entity.Property(u => u.Email)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.HasIndex(u => u.Email)
                    .IsUnique();

                entity.Property(u => u.PasswordHash)
                    .IsRequired();

                entity.Property(u => u.IsActive)
                    .IsRequired()
                    .HasDefaultValue(true);

                entity.HasMany(u => u.TimeLogs)
                    .WithOne(t => t.User)
                    .HasForeignKey(t => t.WorkUserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // TimeLog
            modelBuilder.Entity<TimeLog>(entity =>
            {
                entity.ToTable("TimeLogs");

                entity.HasKey(t => t.Id);

                entity.Property(t => t.TaskDescription)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(t => t.LoggedAt)
                    .IsRequired();

                // Same reasoning as WorkUser.ToTable: the property is WorkUserId,
                // the column stays TimekeepingUserId. No schema change in this phase.
                entity.Property(t => t.WorkUserId)
                    .HasColumnName("TimekeepingUserId")
                    .IsRequired();

                entity.Property(t => t.Duration)
                    .IsRequired()
                    .HasColumnType("numeric(5,2)");

                // SetNull, not Cascade: deleting a task must not delete the hours
                // already booked against it.
                entity.HasOne(t => t.WorkItem)
                    .WithMany(w => w.TimeLogs)
                    .HasForeignKey(t => t.WorkItemId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(t => t.WorkItemId);
            });

            // ── Work module: projects, tasks, labels, milestones ──────────────

            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasIndex(p => p.PublicId).IsUnique();

                entity.Property(p => p.Name).IsRequired().HasMaxLength(150);
                entity.Property(p => p.ColorHex).HasMaxLength(7);

                // Restrict: a project must not vanish because its creator's account
                // was removed — other members are still working in it.
                entity.HasOne(p => p.Owner)
                    .WithMany()
                    .HasForeignKey(p => p.OwnerUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ProjectMember>(entity =>
            {
                entity.HasIndex(m => new { m.ProjectId, m.WorkUserId }).IsUnique();

                entity.HasOne(m => m.Project)
                    .WithMany(p => p.Members)
                    .HasForeignKey(m => m.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(m => m.User)
                    .WithMany()
                    .HasForeignKey(m => m.WorkUserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<WorkItem>(entity =>
            {
                entity.HasIndex(w => w.PublicId).IsUnique();

                entity.Property(w => w.Title).IsRequired().HasMaxLength(200);
                entity.Property(w => w.Summary).HasMaxLength(280);

                // uint RowVersion maps to PostgreSQL's xmin system column, so no
                // physical column is added. SQLite has no equivalent and would
                // materialise a real column that nothing ever increments — a
                // concurrency token that silently never fires is worse than none,
                // so it is unmapped there. Optimistic concurrency is therefore a
                // production behaviour the SQLite suite cannot cover.
                if (Database.IsNpgsql())
                    entity.Property(w => w.RowVersion).IsRowVersion();
                else
                    entity.Ignore(w => w.RowVersion);

                // The board reads every column in this order.
                entity.HasIndex(w => new { w.Status, w.BoardOrder });
                entity.HasIndex(w => w.ProjectId);
                entity.HasIndex(w => w.AssigneeUserId);

                // SetNull: removing a project orphans its tasks rather than
                // destroying them; they fall back to standalone.
                entity.HasOne(w => w.Project)
                    .WithMany(p => p.WorkItems)
                    .HasForeignKey(w => w.ProjectId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(w => w.CreatedBy)
                    .WithMany()
                    .HasForeignKey(w => w.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(w => w.Assignee)
                    .WithMany()
                    .HasForeignKey(w => w.AssigneeUserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Label>(entity =>
            {
                entity.HasIndex(l => l.Name).IsUnique();
                entity.Property(l => l.Name).IsRequired().HasMaxLength(50);
                entity.Property(l => l.ColorHex).IsRequired().HasMaxLength(7);
            });

            modelBuilder.Entity<WorkItemLabel>(entity =>
            {
                entity.HasKey(wl => new { wl.WorkItemId, wl.LabelId });

                entity.HasOne(wl => wl.WorkItem)
                    .WithMany(w => w.WorkItemLabels)
                    .HasForeignKey(wl => wl.WorkItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(wl => wl.Label)
                    .WithMany(l => l.WorkItemLabels)
                    .HasForeignKey(wl => wl.LabelId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Milestone>(entity =>
            {
                entity.HasIndex(m => m.PublicId).IsUnique();
                entity.Property(m => m.Name).IsRequired().HasMaxLength(150);

                entity.HasOne(m => m.Project)
                    .WithMany(p => p.Milestones)
                    .HasForeignKey(m => m.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<PersonalAccessToken>(entity =>
            {
                entity.Property(t => t.Name).IsRequired().HasMaxLength(100);
                entity.Property(t => t.Prefix).IsRequired().HasMaxLength(16);
                entity.Property(t => t.Scopes).IsRequired().HasMaxLength(200);

                // SHA-256 hex. Unique because a collision here would mean two
                // credentials authenticating as each other.
                entity.Property(t => t.TokenHash).IsRequired().HasMaxLength(64);
                entity.HasIndex(t => t.TokenHash).IsUnique();

                entity.HasOne(t => t.User)
                    .WithMany()
                    .HasForeignKey(t => t.WorkUserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // RefreshToken — add UserType column configuration
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.Property(r => r.UserType)
                    .IsRequired()
                    .HasDefaultValue(UserType.Ralphy);
            });

            // User — add PublicId column configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(u => u.PublicId)
                    .IsRequired()
                    .HasDefaultValueSql("gen_random_uuid()");

                entity.HasIndex(u => u.PublicId)
                    .IsUnique();
            });
        }
    }
}