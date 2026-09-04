using Ralphy.Domain.Entities.Work;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    public interface ITimeLogRepository
    {
        Task<TimeLog?> GetByIdAsync(int id, int workUserId);

        Task<(IEnumerable<TimeLog> Items, int TotalCount)> GetFilteredAsync(
            int workUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            string sortBy,
            string sortDir,
            int page,
            int pageSize);

        Task<IEnumerable<TimeLog>> GetForExportAsync(
            int workUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            string sortBy,
            string sortDir);

        Task AddAsync(TimeLog timeLog);

        void Update(TimeLog timeLog);

        void Delete(TimeLog timeLog);
    }
}
