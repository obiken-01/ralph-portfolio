using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
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
        public DbSet<TimekeepingUser> TimekeepingUsers { get; set; }
        public DbSet<TimeLog> TimeLogs { get; set; }

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

            // TimekeepingUser
            modelBuilder.Entity<TimekeepingUser>(entity =>
            {
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
                    .WithOne(t => t.TimekeepingUser)
                    .HasForeignKey(t => t.TimekeepingUserId)
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

                entity.Property(t => t.TimekeepingUserId)
                    .IsRequired();

                entity.Property(t => t.Duration)
                    .IsRequired()
                    .HasColumnType("numeric(5,2)");
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