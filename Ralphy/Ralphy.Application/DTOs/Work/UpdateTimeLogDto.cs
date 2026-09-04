namespace Ralphy.Application.DTOs.Work
{
    public class UpdateTimeLogDto
    {
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