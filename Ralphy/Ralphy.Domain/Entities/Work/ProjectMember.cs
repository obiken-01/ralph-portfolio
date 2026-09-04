using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities.Work
{
    /// <summary>
    /// Membership is what makes a project's work items visible. Unique on
    /// (ProjectId, WorkUserId) — configured in the DbContext.
    /// </summary>
    public class ProjectMember : BaseEntity
    {
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        public int WorkUserId { get; set; }
        public WorkUser User { get; set; } = null!;

        public ProjectRole Role { get; set; } = ProjectRole.Member;
    }
}
