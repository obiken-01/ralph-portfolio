using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    /// <summary>
    /// Wraps the status for the PATCH endpoint.
    ///
    /// The endpoint used to bind a bare enum from the body, which required the
    /// request to be the naked JSON literal `"InProgress"`. A client sending the
    /// obvious `{ "status": "InProgress" }` bound nothing and silently got
    /// Backlog (enum default 0) — a save that returned 200 and changed the wrong
    /// thing. An object with a named property is what every other endpoint here
    /// takes, and it cannot fail that way.
    /// </summary>
    public class UpdateStatusDto
    {
        public WorkItemStatus Status { get; set; }
    }
}
