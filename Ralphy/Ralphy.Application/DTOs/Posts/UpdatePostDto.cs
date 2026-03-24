namespace Ralphy.Application.DTOs.Posts
{
    public class UpdatePostDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? VideoUrl { get; set; }
        public DateTime? PublishedAt { get; set; }
    }
}