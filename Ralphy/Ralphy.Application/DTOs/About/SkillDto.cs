namespace Ralphy.Application.DTOs.About
{
    public class SkillDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Percentage { get; set; }
        public string Category { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }
}