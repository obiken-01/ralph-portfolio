namespace Ralphy.Application.DTOs.Work.Projects
{
    public class ProjectTimelineDto
    {
        public Guid PublicId { get; set; }
        public string Name { get; set; } = string.Empty;

        /// <summary>Computed: min(item starts, project start).</summary>
        public DateOnly RangeStart { get; set; }

        /// <summary>Computed: max(item dues, project target).</summary>
        public DateOnly RangeEnd { get; set; }

        public List<TimelineItemDto> Items { get; set; } = new();

        /// <summary>
        /// Items with no dates at all. They are kept out of Items rather than
        /// defaulted to today — a Gantt full of zero-width bars stacked on today
        /// is worse than an empty one — but returned here so the UI can still
        /// show that they exist.
        /// </summary>
        public List<TimelineItemDto> UndatedItems { get; set; } = new();

        public List<MilestoneDto> Milestones { get; set; } = new();
    }

    public class TimelineItemDto
    {
        public Guid PublicId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ColorHex { get; set; }
        public Guid? AssigneePublicId { get; set; }
        public string? AssigneeDisplayName { get; set; }

        /// <summary>0 or 100 by status for now; refine once sub-tasks exist.</summary>
        public int ProgressPercent { get; set; }
    }
}
