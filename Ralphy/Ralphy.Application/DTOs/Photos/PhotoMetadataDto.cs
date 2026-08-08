namespace Ralphy.Application.DTOs.Photos
{
    /// <summary>
    /// EXIF the browser read off the original file before compression stripped
    /// it, plus the client's queue position. Every field is optional — a photo
    /// with no EXIF is the normal case, not an error.
    /// </summary>
    public class PhotoMetadataDto
    {
        public DateTime? TakenAt { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int? SortOrder { get; set; }
    }
}
