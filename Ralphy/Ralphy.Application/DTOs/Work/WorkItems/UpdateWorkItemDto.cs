namespace Ralphy.Application.DTOs.Work.WorkItems
{
    public class UpdateWorkItemDto : CreateWorkItemDto
    {
        /// <summary>
        /// The UpdatedAt the client last saw. When supplied and the server has
        /// moved past it, the write is refused with 409 and the current state.
        ///
        /// Optional, so online clients that never had a stale snapshot are
        /// unaffected. Omitting it means last-write-wins, as before.
        ///
        /// This is separate from WorkItem.RowVersion, which guards two people
        /// dragging the same card inside one live session. That token is xmin and
        /// changes on every write; an offline client cannot hold one across a
        /// two-day disconnect, so the coarser timestamp is what syncs against.
        /// </summary>
        public DateTime? ExpectedUpdatedAt { get; set; }

        /// <summary>
        /// Detach the task from its project, making it standalone.
        ///
        /// A missing projectPublicId used to mean this, which silently orphaned
        /// every task edited by a client that did not echo the field back — the
        /// task vanished from the project board with nothing on screen to say
        /// why. Omission now KEEPS the current project; unlinking has to be
        /// asked for. Ignored when projectPublicId is supplied, which already
        /// says where the task should end up.
        /// </summary>
        public bool ClearProject { get; set; }
    }
}
