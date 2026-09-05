namespace Ralphy.Domain.Entities.Work
{
    public class TimeLog : BaseEntity
    {
        /// <summary>
        /// Stable client-generatable identity, used as the idempotency key when an
        /// offline outbox replays a create. The routes stay keyed on Id — the tools
        /// site and Ralphy.Web both address logs that way — so this is an extra
        /// handle on the row, not a replacement for the primary key.
        /// </summary>
        public Guid PublicId { get; set; } = Guid.NewGuid();

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
