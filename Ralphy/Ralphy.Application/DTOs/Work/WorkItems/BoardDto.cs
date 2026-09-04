namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class BoardDto
    {
        public List<BoardColumnDto> Columns { get; set; } = new();
    }

    /// <summary>
    /// Every status gets a column, empty ones included: the frontend renders
    /// columns from this response rather than from a hardcoded list, so adding a
    /// status later needs no frontend change.
    /// </summary>
    public class BoardColumnDto
    {
        public string Status { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public int Count { get; set; }
        public List<WorkItemCardDto> Items { get; set; } = new();
    }
}
