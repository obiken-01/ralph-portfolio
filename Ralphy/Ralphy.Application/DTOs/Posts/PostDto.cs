using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Posts
{
    public class PostDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Content { get; set; }
        public string? VideoUrl { get; set; }
        public PostStatus Status { get; set; }
        public int ViewCount { get; set; }
        public DateTime? PublishedAt { get; set; }
        public DateTime? TakenAt { get; set; }
        public int UserId { get; set; }
        public int? TripId { get; set; }
        public DateTime CreatedAt { get; set; }

        // Location, flattened — every card shows the place name.
        public int LocationId { get; set; }

        public string? LocationName { get; set; }
        public bool LocationIsPlaceholder { get; set; }

        // Lead photo, for the card.
        public string? ThumbnailUrl { get; set; }

        public int? ThumbnailWidth { get; set; }
        public int? ThumbnailHeight { get; set; }
        public int PhotoCount { get; set; }

        public ICollection<string> Tags { get; set; } = new List<string>();
    }
}
