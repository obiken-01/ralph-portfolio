using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class MoveWorkItemDto
    {
        public WorkItemStatus Status { get; set; }
        public int NewIndex { get; set; }

        /// <summary>
        /// When the task was actually finished, for a drag made offline. Only
        /// read when Status is Done; null means the server clock. See
        /// UpdateStatusDto.CompletedAt — the two status routes must agree.
        /// </summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// Allows cross-project moves. The service checks membership of the
        /// DESTINATION separately — being able to see the source proves nothing
        /// about the target.
        /// </summary>
        public Guid? ProjectPublicId { get; set; }
    }
}
