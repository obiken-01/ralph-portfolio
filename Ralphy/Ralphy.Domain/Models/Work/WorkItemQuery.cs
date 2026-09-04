using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Models.Work
{
    /// <summary>
    /// Domain-level filter for work item reads. Deliberately not the API DTO: the
    /// DTO speaks in public GUIDs and strings like "me", the repository speaks in
    /// resolved integer ids, and the service is where one becomes the other.
    ///
    /// Dates are DateOnly throughout — PostgreSQL rejects DateTimeKind.Unspecified,
    /// which is the same class of bug as RAL-7. Convert at the repository boundary
    /// with .ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).
    /// </summary>
    public class WorkItemQuery
    {
        public int? ProjectId { get; set; }
        public WorkItemStatus? Status { get; set; }
        public WorkItemPriority? Priority { get; set; }
        public int? LabelId { get; set; }

        public int? AssigneeUserId { get; set; }
        public bool UnassignedOnly { get; set; }

        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }

        public string? Search { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;
        public string? SortBy { get; set; } = "createdAt";
        public string? SortDir { get; set; } = "desc";
    }
}
