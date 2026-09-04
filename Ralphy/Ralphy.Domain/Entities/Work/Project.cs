using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities.Work
{
    public class Project : BaseEntity
    {
        public Guid PublicId { get; set; } = Guid.NewGuid();

        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>"#RRGGBB". Colours the project's bars on the Gantt view.</summary>
        public string? ColorHex { get; set; }

        public ProjectStatus Status { get; set; } = ProjectStatus.Planned;

        public DateOnly? StartDate { get; set; }
        public DateOnly? TargetEndDate { get; set; }
        public DateOnly? ActualEndDate { get; set; }

        public int DisplayOrder { get; set; }

        /// <summary>
        /// The creator. Distinct from membership: the owner also gets a
        /// ProjectMember row (Role = Admin) and cannot be removed from it, because
        /// a project with no members is invisible to everyone including its owner.
        /// </summary>
        public int OwnerUserId { get; set; }
        public WorkUser Owner { get; set; } = null!;

        // Navigation properties
        public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
        public ICollection<WorkItem> WorkItems { get; set; } = new List<WorkItem>();
        public ICollection<Milestone> Milestones { get; set; } = new List<Milestone>();
    }
}
