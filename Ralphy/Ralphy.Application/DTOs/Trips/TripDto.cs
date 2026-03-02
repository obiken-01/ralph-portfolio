using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Trips
{
    public class TripDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Country { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? CoverImageUrl { get; set; }
        public PostStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}