namespace Ralphy.Domain.Entities
{
    public class Location : BaseEntity
    {
        public string PlaceName { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Description { get; set; }

        // Foreign key
        public int TripId { get; set; }

        public Trip Trip { get; set; } = null!;
    }
}