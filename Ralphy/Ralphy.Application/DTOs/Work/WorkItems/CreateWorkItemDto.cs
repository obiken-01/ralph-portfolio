using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class CreateWorkItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string? Description { get; set; }
        public WorkItemStatus Status { get; set; } = WorkItemStatus.Todo;
        public WorkItemPriority Priority { get; set; } = WorkItemPriority.Normal;
        public DateOnly? StartDate { get; set; }
        public DateOnly? DueDate { get; set; }

        /// <summary>Null creates a standalone item, private to its creator.</summary>
        public Guid? ProjectPublicId { get; set; }

        public Guid? AssigneePublicId { get; set; }
        public List<int> LabelIds { get; set; } = new();
    }
}
