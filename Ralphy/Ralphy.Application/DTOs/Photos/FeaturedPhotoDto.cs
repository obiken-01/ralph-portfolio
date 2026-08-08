namespace Ralphy.Application.DTOs.Photos
{
    /// <summary>
    /// A photograph plus just enough of its post to caption it and link to it.
    /// Flattened on purpose — the home page slideshow would otherwise need a
    /// second round-trip per slide to say where the shot was taken.
    /// </summary>
    public class FeaturedPhotoDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public DateTime? TakenAt { get; set; }

        public int PostId { get; set; }
        public string PostTitle { get; set; } = string.Empty;
        public string? LocationName { get; set; }
    }
}
