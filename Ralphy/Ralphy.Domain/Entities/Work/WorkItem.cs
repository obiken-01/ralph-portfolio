using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities.Work
{
    /// <summary>
    /// A task. Named WorkItem rather than Task because System.Threading.Tasks.Task
    /// collides in every async signature; the URL is still /api/work/tasks.
    /// </summary>
    public class WorkItem : BaseEntity
    {
        public Guid PublicId { get; set; } = Guid.NewGuid();

        public string Title { get; set; } = string.Empty;

        /// <summary>The card blurb. Max 280.</summary>
        public string? Summary { get; set; }

        /// <summary>Long form — the modal body.</summary>
        public string? Description { get; set; }

        public WorkItemStatus Status { get; set; } = WorkItemStatus.Todo;
        public WorkItemPriority Priority { get; set; } = WorkItemPriority.Normal;

        public DateOnly? StartDate { get; set; }
        public DateOnly? DueDate { get; set; }

        /// <summary>UTC. Set when Status becomes Done.</summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>Position within its status column on the board.</summary>
        public int BoardOrder { get; set; }

        /// <summary>Null means standalone — visible only to its creator.</summary>
        public int? ProjectId { get; set; }
        public Project? Project { get; set; }

        /// <summary>
        /// Never changes. Kept separate from AssigneeUserId on purpose: collapsing
        /// the two forces a migration the first time a task changes hands.
        /// </summary>
        public int CreatedByUserId { get; set; }
        public WorkUser CreatedBy { get; set; } = null!;

        /// <summary>Null means unassigned.</summary>
        public int? AssigneeUserId { get; set; }
        public WorkUser? Assignee { get; set; }

        /// <summary>
        /// Concurrency token, mapped to PostgreSQL's xmin system column — no
        /// physical column is added. Two people dragging the same card is the
        /// case this exists for; the loser gets a 409.
        /// </summary>
        public uint RowVersion { get; set; }

        // Navigation properties
        public ICollection<WorkItemLabel> WorkItemLabels { get; set; } = new List<WorkItemLabel>();
        public ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
    }
}
