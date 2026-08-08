namespace Ralphy.Application.DTOs.Locations
{
    public class CreateLocationDto
    {
        public string PlaceName { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Description { get; set; }
    }
}
