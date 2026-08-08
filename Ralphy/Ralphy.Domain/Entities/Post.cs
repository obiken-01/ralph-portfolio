using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class Post : BaseEntity
    {
        public string Title { get; set; } = string.Empty;

        /// <summary>Optional long-form description. Photo-first posts often have none.</summary>
        public string? Content { get; set; }

        public string? VideoUrl { get; set; }
        public PostStatus Status { get; set; } = PostStatus.Draft;
        public int ViewCount { get; set; } = 0;
        public DateTime? PublishedAt { get; set; }

        /// <summary>Earliest EXIF capture time across this post's photos. Drives timeline grouping.</summary>
        public DateTime? TakenAt { get; set; }

        // Foreign keys
        public int UserId { get; set; }

        public User User { get; set; } = null!;

        public int LocationId { get; set; }

        public Location Location { get; set; } = null!;

        /// <summary>Legacy grouping. Nullable since v2.0; dropped once Trip is removed.</summary>
        public int? TripId { get; set; }

        public Trip? Trip { get; set; }

        // Navigation properties
        public ICollection<Photo> Photos { get; set; } = new List<Photo>();

        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    }
}
