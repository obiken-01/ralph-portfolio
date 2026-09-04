namespace Ralphy.Application.DTOs.Work.Tokens
{
    public class CreatePatDto
    {
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Defaults to read-only. Handing out write access should be a decision,
        /// not what happens when the field is left off.
        /// </summary>
        public List<string> Scopes { get; set; } = new() { PatScopes.TasksRead };

        public DateTime? ExpiresAt { get; set; }
    }

    public static class PatScopes
    {
        public const string TasksRead = "tasks:read";
        public const string TasksWrite = "tasks:write";

        public static readonly IReadOnlySet<string> All =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { TasksRead, TasksWrite };
    }
}
