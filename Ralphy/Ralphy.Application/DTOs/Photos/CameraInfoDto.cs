namespace Ralphy.Application.DTOs.Photos
{
    /// <summary>
    /// What the photo was shot with and how. Read from EXIF on upload, and
    /// editable afterwards — a film scan reports the scanner, and an export
    /// with metadata stripped reports nothing. Every field is optional.
    /// </summary>
    public class CameraInfoDto
    {
        /// <summary>Display name, e.g. "Sony ILCE-7M4" or "iPhone 15 Pro".</summary>
        public string? Camera { get; set; }

        public string? Lens { get; set; }

        /// <summary>Aperture as the f-number: 1.8 means f/1.8.</summary>
        public double? FNumber { get; set; }

        /// <summary>Shutter speed in seconds: 1/250s is 0.004.</summary>
        public double? ExposureTime { get; set; }

        public int? Iso { get; set; }

        /// <summary>Millimetres as marked on the lens; the 35mm equivalent for a phone.</summary>
        public double? FocalLength { get; set; }

        /// <summary>The editor, e.g. "Lightroom". Null for straight-from-camera.</summary>
        public string? EditedWith { get; set; }
    }
}
