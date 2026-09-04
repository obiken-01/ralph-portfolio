namespace Ralphy.Domain.Entities.Work
{
    /// <summary>
    /// Workspace-wide, deliberately not user-scoped: three people creating
    /// "urgent" in three colours breaks cross-project filtering.
    /// </summary>
    public class Label : BaseEntity
    {
        /// <summary>Lowercase, unique workspace-wide.</summary>
        public string Name { get; set; } = string.Empty;

        public string ColorHex { get; set; } = "#9E9E9E";

        // Navigation properties
        public ICollection<WorkItemLabel> WorkItemLabels { get; set; } = new List<WorkItemLabel>();
    }
}
