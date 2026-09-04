namespace Ralphy.Application.DTOs.Work
{
    public class TimeLogDto
    {
        public int Id { get; set; }
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal Duration { get; set; }

        /// <summary>Null for logs not booked against a task, including every legacy row.</summary>
        public Guid? WorkItemId { get; set; }

        public string? WorkItemTitle { get; set; }
    }
}