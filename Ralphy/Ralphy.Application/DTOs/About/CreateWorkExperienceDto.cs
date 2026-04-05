namespace Ralphy.Application.DTOs.About
{
    public class CreateWorkExperienceDto
    {
        public string Role { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<string> Tags { get; set; } = new();
        public int DisplayOrder { get; set; }
    }
}