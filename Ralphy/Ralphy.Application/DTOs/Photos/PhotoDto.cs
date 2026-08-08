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
        public int SortOrder { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public DateTime? TakenAt { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int PostId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
