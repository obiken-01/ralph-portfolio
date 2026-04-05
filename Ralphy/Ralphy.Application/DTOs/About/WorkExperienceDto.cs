namespace Ralphy.Application.DTOs.About
{
    public class WorkExperienceDto
    {
        public int Id { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<string> Tags { get; set; } = new();
        public int DisplayOrder { get; set; }
    }
}