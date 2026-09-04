namespace Ralphy.Domain.Enums
{
    /// <summary>
    /// Doubles as the Kanban column set — the board renders one column per member,
    /// in this order. User-defined columns are out of scope.
    /// </summary>
    public enum WorkItemStatus
    {
        Backlog = 0,
        Todo = 1,
        InProgress = 2,
        Blocked = 3,
        Done = 4,
        Cancelled = 5
    }
}
