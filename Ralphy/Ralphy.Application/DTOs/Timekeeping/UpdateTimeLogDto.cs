namespace Ralphy.Application.DTOs.Timekeeping
{
    public class UpdateTimeLogDto
    {
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
    }
}