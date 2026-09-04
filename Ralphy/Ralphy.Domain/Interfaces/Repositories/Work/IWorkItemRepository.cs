using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Models.Work;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    /// <summary>
    /// Every read takes a userId and goes through the implementation's visibility
    /// predicate. There is deliberately no unscoped accessor on this interface —
    /// a work item is visible only if you created it and it has no project, or it
    /// belongs to a project you are a member of. Skipping that on a single-item
    /// fetch means a guessed GUID reads someone else's task.
    /// </summary>
    public interface IWorkItemRepository
    {
        Task<(IReadOnlyList<WorkItem> Items, int Total)> QueryAsync(
            int userId, WorkItemQuery query, CancellationToken ct = default);

        Task<IReadOnlyList<WorkItem>> GetBoardAsync(
            int userId, int? projectId, int? assigneeUserId, CancellationToken ct = default);

        Task<WorkItem?> GetByPublicIdAsync(int userId, Guid publicId, CancellationToken ct = default);

        /// <summary>Same predicate as the read path, without the Includes.</summary>
        Task<WorkItem?> GetForWriteAsync(int userId, Guid publicId, CancellationToken ct = default);

        Task<int> GetNextBoardOrderAsync(
            int userId, WorkItemStatus status, int? projectId, CancellationToken ct = default);

        /// <summary>
        /// Renumbers one board column after a drag. SaveChanges is the caller's job;
        /// a DbUpdateConcurrencyException means someone moved a card first — 409.
        ///
        /// userId is not decoration. The column is keyed on (status, projectId), and
        /// for standalone items projectId is null — so without scoping, renumbering
        /// your own personal column would rewrite every other user's standalone
        /// items in that status too.
        /// </summary>
        Task ReorderColumnAsync(
            int userId,
            WorkItemStatus status,
            int? projectId,
            Guid movedPublicId,
            int newIndex,
            CancellationToken ct = default);

        Task AddAsync(WorkItem item, CancellationToken ct = default);

        void Remove(WorkItem item);
    }
}
