using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Photos
{
    public class PhotoDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public MediaType Type { get; set; }
        public MediaSource Source { get; set; }
        public int PostId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}