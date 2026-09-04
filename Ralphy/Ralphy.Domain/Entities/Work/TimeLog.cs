namespace Ralphy.Domain.Entities.Work
{
    public class TimeLog : BaseEntity
    {
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public decimal Duration { get; set; }

        public int WorkUserId { get; set; }
        public WorkUser User { get; set; } = null!;

        /// <summary>
        /// Optional link to the task this time was spent on. Nullable and
        /// ON DELETE SET NULL: logs predating the Work module keep null, and
        /// deleting a task must not delete the hours booked against it.
        /// </summary>
        public int? WorkItemId { get; set; }
        public WorkItem? WorkItem { get; set; }
    }
}
