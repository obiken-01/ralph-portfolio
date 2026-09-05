namespace Ralphy.Application.DTOs.Work
{
    public class UpdateTimeLogDto
    {
        /// <summary>
        /// The UpdatedAt the client last saw. When supplied and the server has
        /// moved past it, the write is refused with 409 and the current state.
        ///
        /// Optional, so online clients that never had a stale snapshot are
        /// unaffected. Omitting it means last-write-wins, as before.
        /// </summary>
        public DateTime? ExpectedUpdatedAt { get; set; }

        public string TaskDescription { get; set; } = string.Empty;
        public DateTime LoggedAt { get; set; }
        public decimal Duration { get; set; }

        /// <summary>
        /// Optional link to the task this time was spent on, by public id.
        ///
        /// The spec writes this as an int; every other Work surface addresses
        /// entities by GUID and never leaks a sequential key, and the service has
        /// to resolve it through the visibility predicate regardless — so it is a
        /// public id here too.
        /// </summary>
        public Guid? WorkItemId { get; set; }
    }
}