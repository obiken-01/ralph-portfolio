namespace Ralphy.Application.DTOs.Comments
{
    public class CreateCommentDto
    {
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorEmail { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}