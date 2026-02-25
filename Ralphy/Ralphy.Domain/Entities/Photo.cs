using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class Photo : BaseEntity
    {
        public string Url { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public MediaType Type { get; set; } = MediaType.Image;
        public MediaSource Source { get; set; } = MediaSource.Phone;

        // Foreign key
        public int PostId { get; set; }

        public Post Post { get; set; } = null!;
    }
}