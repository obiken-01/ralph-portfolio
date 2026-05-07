using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class TimeLogRepository : ITimeLogRepository
    {
        private readonly AppDbContext _context;

        public TimeLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TimeLog?> GetByIdAsync(int id, int timekeepingUserId)
            => await _context.TimeLogs
                .FirstOrDefaultAsync(t => t.Id == id && t.TimekeepingUserId == timekeepingUserId);

        public async Task<(IEnumerable<TimeLog> Items, int TotalCount)> GetFilteredAsync(
            int timekeepingUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            string sortBy,
            string sortDir,
            int page,
            int pageSize)
        {
            var query = BuildQuery(timekeepingUserId, from, to, search);
            query = ApplySort(query, sortBy, sortDir);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<IEnumerable<TimeLog>> GetForExportAsync(
            int timekeepingUserId,
            DateOnly? from,
            DateOnly? to,
            string? search,
            string sortBy,
            string sortDir)
        {
            var query = BuildQuery(timekeepingUserId, from, to, search);
            query = ApplySort(query, sortBy, sortDir);

            return await query.ToListAsync();
        }

        public async Task AddAsync(TimeLog timeLog)
            => await _context.TimeLogs.AddAsync(timeLog);

        public void Update(TimeLog timeLog)
            => _context.TimeLogs.Update(timeLog);

        public void Delete(TimeLog timeLog)
            => _context.TimeLogs.Remove(timeLog);

        // --- private helpers ---

        private IQueryable<TimeLog> BuildQuery(
            int timekeepingUserId,
            DateOnly? from,
            DateOnly? to,
            string? search)
        {
            var query = _context.TimeLogs
                .Where(t => t.TimekeepingUserId == timekeepingUserId);

            if (from.HasValue)
                query = query.Where(t => t.LoggedAt >= from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));

            if (to.HasValue)
                query = query.Where(t => t.LoggedAt <= to.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc));

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t => t.TaskDescription.ToLower().Contains(search.ToLower()));

            return query;
        }

        private IQueryable<TimeLog> ApplySort(IQueryable<TimeLog> query, string sortBy, string sortDir)
        {
            var descending = sortDir.ToLower() == "desc";

            return sortBy.ToLower() switch
            {
                "createdat" => descending
                    ? query.OrderByDescending(t => t.CreatedAt)
                    : query.OrderBy(t => t.CreatedAt),
                _ => descending
                    ? query.OrderByDescending(t => t.LoggedAt)
                    : query.OrderBy(t => t.LoggedAt)
            };
        }
    }
}