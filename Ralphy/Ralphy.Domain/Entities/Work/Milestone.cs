namespace Ralphy.Domain.Entities.Work
{
    /// <summary>A dated marker on a project's timeline — the diamonds on the Gantt.</summary>
    public class Milestone : BaseEntity
    {
        public Guid PublicId { get; set; } = Guid.NewGuid();

        public string Name { get; set; } = string.Empty;
        public DateOnly Date { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
    }
}
