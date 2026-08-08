namespace Ralphy.Application.DTOs.Locations
{
    public class LocationDto
    {
        public int Id { get; set; }
        public string PlaceName { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Description { get; set; }
        public bool IsPlaceholder { get; set; }

        /// <summary>Published posts at this place. Drives the map popup.</summary>
        public int PostCount { get; set; }
    }
}
