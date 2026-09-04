namespace Ralphy.Application.DTOs.Work
{
    public class WorkUserDto
    {
        public Guid PublicId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}