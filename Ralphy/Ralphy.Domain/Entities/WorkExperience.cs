namespace Ralphy.Domain.Entities
{
    public class WorkExperience : BaseEntity
    {
        public string Role { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Tags { get; set; } = string.Empty; // comma-separated e.g. ".NET,React,PostgreSQL"
        public int DisplayOrder { get; set; }
    }
}