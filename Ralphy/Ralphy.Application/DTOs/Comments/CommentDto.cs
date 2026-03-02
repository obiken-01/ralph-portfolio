namespace Ralphy.Application.DTOs.Comments
{
    public class CommentDto
    {
        public int Id { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int PostId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}