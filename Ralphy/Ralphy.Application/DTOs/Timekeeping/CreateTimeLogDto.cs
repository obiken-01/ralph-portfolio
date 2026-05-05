namespace Ralphy.Application.DTOs.Timekeeping
{
    public class CreateTimeLogDto
    {
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public decimal Duration { get; set; }

    }
}