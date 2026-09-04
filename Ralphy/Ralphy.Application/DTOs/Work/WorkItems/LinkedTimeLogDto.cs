namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class LinkedTimeLogDto
    {
        public int Id { get; set; }
        public string TaskDescription { get; set; } = string.Empty;
        public decimal Duration { get; set; }
        public DateTime LoggedAt { get; set; }
    }
}
