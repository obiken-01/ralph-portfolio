namespace Ralphy.Application.DTOs.Timekeeping
{
    public class TimeLogDto
    {
        public int Id { get; set; }
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal Duration { get; set; }

    }
}