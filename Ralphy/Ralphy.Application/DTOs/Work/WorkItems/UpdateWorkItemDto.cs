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
    }
}
