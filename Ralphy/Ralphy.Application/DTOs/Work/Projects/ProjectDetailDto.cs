namespace Ralphy.Application.DTOs.Work.Projects
{
    public class ProjectDetailDto : ProjectListItemDto
    {
        public DateOnly? ActualEndDate { get; set; }
        public Guid OwnerPublicId { get; set; }
        public string OwnerDisplayName { get; set; } = string.Empty;
        public List<ProjectMemberDto> Members { get; set; } = new();
        public List<MilestoneDto> Milestones { get; set; } = new();
    }
}
