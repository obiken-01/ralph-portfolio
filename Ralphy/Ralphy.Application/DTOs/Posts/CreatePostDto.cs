namespace Ralphy.Application.DTOs.Posts
{
    public class CreatePostDto
    {
        public string Title { get; set; } = string.Empty;

        /// <summary>Optional — a photo-first post needs no prose.</summary>
        public string? Content { get; set; }

        public string? VideoUrl { get; set; }

        public int LocationId { get; set; }

        /// <summary>Legacy. Ignored when null; dropped once Trip is removed.</summary>
        public int? TripId { get; set; }
    }
}
