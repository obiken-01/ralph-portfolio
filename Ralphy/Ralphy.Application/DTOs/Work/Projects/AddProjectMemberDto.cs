using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.Projects
{
    public class AddProjectMemberDto
    {
        public Guid UserPublicId { get; set; }
        public ProjectRole Role { get; set; } = ProjectRole.Member;
    }
}
