namespace Ralphy.Application.DTOs.Work.Projects
{
    public class ProjectMemberDto
    {
        public Guid UserPublicId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsOwner { get; set; }
    }
}
