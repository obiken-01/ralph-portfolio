using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class Skill : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public int Percentage { get; set; }
        public SkillCategory Category { get; set; }
        public int DisplayOrder { get; set; }
    }
}