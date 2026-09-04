namespace Ralphy.Domain.Entities.Work
{
    public class TimeLog : BaseEntity
    {
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public decimal Duration { get; set; }

        public int WorkUserId { get; set; }
        public WorkUser User { get; set; } = null!;
    }
}
