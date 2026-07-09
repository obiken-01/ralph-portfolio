using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Posts
{
    public class PostDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? VideoUrl { get; set; }
        public PostStatus Status { get; set; }
        public int ViewCount { get; set; }
        public DateTime? PublishedAt { get; set; }
        public int TripId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ThumbnailUrl { get; set; }
        public int PhotoCount { get; set; }
    }
}