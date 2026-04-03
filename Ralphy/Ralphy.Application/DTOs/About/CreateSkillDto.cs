using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.About
{
    public class CreateSkillDto
    {
        public string Name { get; set; } = string.Empty;
        public int Percentage { get; set; }
        public SkillCategory Category { get; set; }
        public int DisplayOrder { get; set; }
    }
}