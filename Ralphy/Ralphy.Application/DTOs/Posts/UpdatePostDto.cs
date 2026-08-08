namespace Ralphy.Application.DTOs.Posts
{
    public class UpdatePostDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Content { get; set; }
        public string? VideoUrl { get; set; }
        public int LocationId { get; set; }
        public DateTime? PublishedAt { get; set; }
    }
}
