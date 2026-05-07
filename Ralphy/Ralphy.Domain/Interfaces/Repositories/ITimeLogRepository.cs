using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ITimeLogRepository
    {
        Task<TimeLog?> GetByIdAsync(int id, int timekeepingUserId);

        Task<(IEnumerable<TimeLog> Items, int TotalCount)> GetFilteredAsync(
            int timekeepingUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            string sortBy,
            string sortDir,
            int page,
            int pageSize);

        Task<IEnumerable<TimeLog>> GetForExportAsync(
            int timekeepingUserId,
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