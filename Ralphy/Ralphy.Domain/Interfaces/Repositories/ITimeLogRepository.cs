using Ralphy.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ITimeLogRepository
    {
        Task<TimeLog?> GetByIdAsync(int id, int timekeepingUserId);
        Task<(IEnumerable<TimeLog> Items, int TotalCount)> GetFilteredAsync(
            int timekeepingUserId,
            DateTime? from,
            DateTime? to,
            string? search,
            string sortBy,
            string sortDir,
            int page,
            int pageSize);
        Task<IEnumerable<TimeLog>> GetForExportAsync(
            int timekeepingUserId,
            DateTime? from,
            DateTime? to,
            string? search,
            string sortBy,
            string sortDir);
        Task AddAsync(TimeLog timeLog);
        void Update(TimeLog timeLog);
        void Delete(TimeLog timeLog);
    }
}
