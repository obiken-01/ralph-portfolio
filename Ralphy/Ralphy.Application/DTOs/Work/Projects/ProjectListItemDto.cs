namespace Ralphy.Application.DTOs.Work.Projects
{
    public class ProjectListItemDto
    {
        public Guid PublicId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ColorHex { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateOnly? StartDate { get; set; }
        public DateOnly? TargetEndDate { get; set; }
        public int TotalItems { get; set; }
        public int CompletedItems { get; set; }

        /// <summary>The caller's own ProjectRole.</summary>
        public string MyRole { get; set; } = string.Empty;
    }
}
