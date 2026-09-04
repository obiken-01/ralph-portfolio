using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    /// <summary>
    /// DateOnly on every date filter — PostgreSQL rejects DateTimeKind.Unspecified,
    /// the same class of bug as RAL-7.
    /// </summary>
    public class WorkItemQueryDto
    {
        public Guid? ProjectPublicId { get; set; }
        public WorkItemStatus? Status { get; set; }
        public WorkItemPriority? Priority { get; set; }
        public int? LabelId { get; set; }

        /// <summary>"me" | "unassigned" | a user's public id.</summary>
        public string? Assignee { get; set; }

        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
        public string? Search { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;
        public string? SortBy { get; set; } = "createdAt";
        public string? SortDir { get; set; } = "desc";
    }
}
