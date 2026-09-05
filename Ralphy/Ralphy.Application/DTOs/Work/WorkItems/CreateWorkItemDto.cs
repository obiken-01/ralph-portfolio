using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class CreateWorkItemDto
    {
        /// <summary>
        /// Optional client-supplied identity, for offline creates. See
        /// CreateTimeLogDto.PublicId — same contract.
        ///
        /// Inherited by UpdateWorkItemDto, where it is ignored: the update route
        /// already carries the id in its path, and honouring a body value there
        /// would let a client re-point an edit at a different record.
        /// </summary>
        public Guid? PublicId { get; set; }

        /// <summary>
        /// When the task was actually finished, for a status change made offline.
        ///
        /// Only read when the status is Done. Null means the server clock, which
        /// is what every online caller sends — a task completed on Monday and
        /// synced on Wednesday would otherwise report Wednesday, and the
        /// accomplishment report would credit the wrong day.
        /// </summary>
        public DateTime? CompletedAt { get; set; }

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
