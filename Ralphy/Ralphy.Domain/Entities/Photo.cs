using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class Photo : BaseEntity
    {
        public string Url { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public MediaType Type { get; set; } = MediaType.Image;

        /// <summary>Display order within the post's gallery. Lower comes first.</summary>
        public int SortOrder { get; set; }

        // Intrinsic dimensions, straight off the Cloudinary upload result.
        // Present so the grid can reserve the right box before the image loads.
        public int? Width { get; set; }
        public int? Height { get; set; }

        // EXIF, read client-side before compression strips it.
        public DateTime? TakenAt { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        // Camera and exposure, also EXIF. Editable afterwards, since a film scan
        // or a stripped export reports the wrong thing or nothing at all.
        public string? Camera { get; set; }
        public string? Lens { get; set; }
        public double? FNumber { get; set; }

        /// <summary>Seconds: 1/250s is stored as 0.004.</summary>
        public double? ExposureTime { get; set; }

        public int? Iso { get; set; }
        public double? FocalLength { get; set; }
        public string? EditedWith { get; set; }

        // Foreign key
        public int PostId { get; set; }

        public Post Post { get; set; } = null!;
    }
}
