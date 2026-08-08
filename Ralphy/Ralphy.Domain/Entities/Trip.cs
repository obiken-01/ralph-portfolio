using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class Trip : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Country { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? CoverImageUrl { get; set; }
        public PostStatus Status { get; set; } = PostStatus.Draft;

        // Foreign key
        public int UserId { get; set; }

        public User User { get; set; } = null!;

        // Navigation properties
        public ICollection<Post> Posts { get; set; } = new List<Post>();
    }
}