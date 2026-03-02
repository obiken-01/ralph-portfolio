namespace Ralphy.Application.DTOs.Posts
{
    public class CreatePostDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? VideoUrl { get; set; }
        public int TripId { get; set; }
    }
}