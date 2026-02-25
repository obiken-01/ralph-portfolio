using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class Post : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? VideoUrl { get; set; }
        public PostStatus Status { get; set; } = PostStatus.Draft;
        public int ViewCount { get; set; } = 0;
        public DateTime? PublishedAt { get; set; }

        // Foreign key
        public int TripId { get; set; }

        public Trip Trip { get; set; } = null!;

        // Navigation properties
        public ICollection<Photo> Photos { get; set; } = new List<Photo>();

        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    }
}