namespace Ralphy.Application.DTOs.Work.Directory
{
    /// <summary>
    /// What an assignee or member picker needs, and nothing else. Deliberately not
    /// the admin DTO: no email, no timestamps, no role.
    /// </summary>
    public class WorkUserDirectoryDto
    {
        public Guid PublicId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
