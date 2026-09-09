namespace Ralphy.Application.DTOs.Work
{
    public class TimeLogDto
    {
        public int Id { get; set; }

        /// <summary>
        /// The idempotency key. Echoed back so a syncing client can match what it
        /// queued against what the server actually holds.
        /// </summary>
        public Guid PublicId { get; set; }
        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Last edit, or null if there has not been one.
        ///
        /// This is the value UpdateTimeLogDto.ExpectedUpdatedAt asks the client
        /// for, so it has to leave the server for the conflict check to be usable
        /// at all: without it a client can only echo CreatedAt, which stops
        /// matching the moment the log is edited once — and then every later
        /// offline edit is refused as stale against a value it had no way to
        /// learn. WorkItemDetailDto already exposes this; the time log DTO was
        /// simply missed.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
        public decimal Duration { get; set; }

        /// <summary>Null for logs not booked against a task, including every legacy row.</summary>
        public Guid? WorkItemId { get; set; }

        public string? WorkItemTitle { get; set; }
    }
}