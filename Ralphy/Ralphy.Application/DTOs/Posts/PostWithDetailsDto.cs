using Ralphy.Application.DTOs.Comments;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Posts
{
    public class PostWithDetailsDto
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

        public int LocationId { get; set; }
        public string? LocationName { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public bool LocationIsPlaceholder { get; set; }

        public ICollection<PhotoDto> Photos { get; set; } = new List<PhotoDto>();
        public ICollection<CommentDto> Comments { get; set; } = new List<CommentDto>();
        public ICollection<string> Tags { get; set; } = new List<string>();
    }
}
