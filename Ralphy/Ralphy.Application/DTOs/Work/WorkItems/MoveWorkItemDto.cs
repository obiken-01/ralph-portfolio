using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class MoveWorkItemDto
    {
        public WorkItemStatus Status { get; set; }
        public int NewIndex { get; set; }

        /// <summary>
        /// Allows cross-project moves. The service checks membership of the
        /// DESTINATION separately — being able to see the source proves nothing
        /// about the target.
        /// </summary>
        public Guid? ProjectPublicId { get; set; }
    }
}
