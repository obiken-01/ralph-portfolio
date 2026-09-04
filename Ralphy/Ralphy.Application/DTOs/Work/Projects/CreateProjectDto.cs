using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.Projects
{
    public class CreateProjectDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ColorHex { get; set; }
        public ProjectStatus Status { get; set; } = ProjectStatus.Planned;
        public DateOnly? StartDate { get; set; }
        public DateOnly? TargetEndDate { get; set; }
    }
}
