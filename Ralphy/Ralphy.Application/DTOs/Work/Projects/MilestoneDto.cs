namespace Ralphy.Application.DTOs.Work.Projects
{
    public class MilestoneDto
    {
        public Guid PublicId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
    }
}
