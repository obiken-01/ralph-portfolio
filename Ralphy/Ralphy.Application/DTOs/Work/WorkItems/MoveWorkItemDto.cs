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
        ///
        /// Omitting it keeps the card in the project it is already in. It used to
        /// mean "standalone", so a board that dragged a card without echoing the
        /// field back unlinked it from its project on every drop.
        /// </summary>
        public Guid? ProjectPublicId { get; set; }

        /// <summary>
        /// Drop the card out of its project as part of the move. See
        /// UpdateWorkItemDto.ClearProject — the two write paths must agree on
        /// what an absent project means, or one of them orphans tasks.
        /// </summary>
        public bool ClearProject { get; set; }
    }
}
