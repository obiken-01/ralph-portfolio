namespace Ralphy.Application.DTOs.Work
{
    public class CreateTimeLogDto
    {
        /// <summary>
        /// Optional client-supplied identity, for offline creates.
        ///
        /// Absent, the server generates one and nothing changes. Present and
        /// already used by this caller, the existing log is returned untouched —
        /// that is what stops a retried request, whose first response was lost,
        /// from booking the same hours twice.
        /// </summary>
        public Guid? PublicId { get; set; }

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