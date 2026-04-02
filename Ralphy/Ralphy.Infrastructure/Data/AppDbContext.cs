using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;

namespace Ralphy.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<Post> Posts => Set<Post>();
        public DbSet<Photo> Photos => Set<Photo>();
        public DbSet<Comment> Comments => Set<Comment>();
        public DbSet<Location> Locations => Set<Location>();
        public DbSet<Tag> Tags => Set<Tag>();
        public DbSet<PostTag> PostTags => Set<PostTag>();
        public DbSet<AboutProfile> AboutProfiles => Set<AboutProfile>();

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
            modelBuilder.Entity<User>()
                .HasMany(u => u.Trips)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasMany(u => u.RefreshTokens)
                .WithOne(rt => rt.User)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Trip relationships
            modelBuilder.Entity<Trip>()
                .HasMany(t => t.Posts)
                .WithOne(p => p.Trip)
                .HasForeignKey(p => p.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Trip>()
                .HasMany(t => t.Locations)
                .WithOne(l => l.Trip)
                .HasForeignKey(l => l.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            // Post relationships
            modelBuilder.Entity<Post>()
                .HasMany(p => p.Photos)
                .WithOne(ph => ph.Post)
                .HasForeignKey(ph => ph.PostId)
                .OnDelete(DeleteBehavior.Cascade);

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
            modelBuilder.Entity<Trip>()
                .Property(t => t.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Post>()
                .Property(p => p.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Photo>()
                .Property(p => p.Type)
                .HasConversion<string>();

            modelBuilder.Entity<Photo>()
                .Property(p => p.Source)
                .HasConversion<string>();
        }
    }
}