namespace Ralphy.Domain.Entities
{
    public class TimeLog : BaseEntity
    {
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public int TimekeepingUserId { get; set; }

        public TimekeepingUser TimekeepingUser { get; set; } = null!;
    }
}