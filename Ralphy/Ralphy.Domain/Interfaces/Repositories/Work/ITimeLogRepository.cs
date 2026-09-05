using Ralphy.Domain.Entities.Work;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    public interface ITimeLogRepository
    {
        Task<TimeLog?> GetByIdAsync(int id, int workUserId);

        /// <summary>
        /// Looks a log up by its client-supplied public id, scoped to the caller.
        ///
        /// The scoping is the point: a replayed create must never resolve to
        /// another user's row on a GUID collision, deliberate or otherwise. On a
        /// collision across users the insert fails on the unique index instead,
        /// which is the correct outcome — a 500 the client retries, not a silent
        /// hand-off of someone else's record.
        /// </summary>
        Task<TimeLog?> GetByPublicIdAsync(Guid publicId, int workUserId);

        Task<(IEnumerable<TimeLog> Items, int TotalCount)> GetFilteredAsync(
            int workUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            int? workItemId,
            string sortBy,
            string sortDir,
            int page,
            int pageSize);

        Task<IEnumerable<TimeLog>> GetForExportAsync(
            int workUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            int? workItemId,
            string sortBy,
            string sortDir);

        /// <summary>
        /// Logs in a date range with their work item and project loaded, for the
        /// accomplishment report. Self-scoped like everything else here — there is
        /// no overload that reads another user's hours.
        /// </summary>
        Task<IReadOnlyList<TimeLog>> GetForRangeAsync(
            int workUserId, DateOnly from, DateOnly to, CancellationToken ct = default);

        Task AddAsync(TimeLog timeLog);

        void Update(TimeLog timeLog);

        void Delete(TimeLog timeLog);
    }
}
