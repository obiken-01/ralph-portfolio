namespace Ralphy.Application.DTOs.Work
{
    public class CreateTimeLogDto
    {
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public decimal Duration { get; set; }

    }
}