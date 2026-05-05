namespace Ralphy.Application.DTOs.Timekeeping
{
    public class TimeLogQueryDto
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Search { get; set; }
        public string SortBy { get; set; } = "loggedAt";
        public string SortDir { get; set; } = "desc";
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}