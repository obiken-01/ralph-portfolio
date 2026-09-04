using Ralphy.Application.DTOs.Work.Labels;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    /// <summary>
    /// The card shape, used by BOTH the list view and the Kanban board — one DTO,
    /// one component, one cache entry on the frontend.
    ///
    /// Enums cross the wire as names rather than ints, so the client never keeps a
    /// parallel copy of the numbering.
    /// </summary>
    public class WorkItemCardDto
    {
        public Guid PublicId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateOnly? StartDate { get; set; }
        public DateOnly? DueDate { get; set; }
        public int BoardOrder { get; set; }
        public Guid? ProjectPublicId { get; set; }
        public string? ProjectName { get; set; }
        public string? ProjectColorHex { get; set; }
        public Guid? AssigneePublicId { get; set; }
        public string? AssigneeDisplayName { get; set; }
        public List<LabelDto> Labels { get; set; } = new();
    }
}
