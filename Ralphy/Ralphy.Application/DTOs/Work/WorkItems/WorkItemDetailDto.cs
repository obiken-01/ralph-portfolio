namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class WorkItemDetailDto : WorkItemCardDto
    {
        public string? Description { get; set; }
        public DateTime? CompletedAt { get; set; }
        public Guid CreatedByPublicId { get; set; }
        public string CreatedByDisplayName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        /// <summary>The caller's own logged hours only, never the whole team's.</summary>
        public decimal TotalHoursLogged { get; set; }

        public List<LinkedTimeLogDto> TimeLogs { get; set; } = new();
    }
}
