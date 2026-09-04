namespace Ralphy.Domain.Entities.Work
{
    /// <summary>Join entity, mirroring the existing PostTag pattern.</summary>
    public class WorkItemLabel
    {
        public int WorkItemId { get; set; }
        public WorkItem WorkItem { get; set; } = null!;

        public int LabelId { get; set; }
        public Label Label { get; set; } = null!;
    }
}
