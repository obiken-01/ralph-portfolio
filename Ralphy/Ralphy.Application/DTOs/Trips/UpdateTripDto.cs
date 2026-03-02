namespace Ralphy.Application.DTOs.Trips
{
    public class UpdateTripDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Country { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? CoverImageUrl { get; set; }
    }
}