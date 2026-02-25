namespace Ralphy.Domain.Entities
{
    public class Comment : BaseEntity
    {
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorEmail { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;

        // Foreign key
        public int PostId { get; set; }

        public Post Post { get; set; } = null!;
    }
}