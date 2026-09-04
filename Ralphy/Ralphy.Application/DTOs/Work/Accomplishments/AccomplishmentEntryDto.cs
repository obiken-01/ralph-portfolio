namespace Ralphy.Application.DTOs.Work.Accomplishments
{
    public class AccomplishmentEntryDto
    {
        /// <summary>Null for unlinked legacy logs.</summary>
        public Guid? WorkItemPublicId { get; set; }

        /// <summary>The work item's title, or the raw TaskDescription if unlinked.</summary>
        public string Title { get; set; } = string.Empty;

        public string? ProjectName { get; set; }
        public string? Status { get; set; }
        public decimal Hours { get; set; }

        /// <summary>Every TaskDescription merged for that item on that day.</summary>
        public List<string> Descriptions { get; set; } = new();
    }
}
