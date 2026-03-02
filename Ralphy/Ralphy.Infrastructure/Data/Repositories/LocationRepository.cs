using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class LocationRepository : BaseRepository<Location>, ILocationRepository
    {
        public LocationRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Location>> GetAllLocationsAsync() =>
            await _dbSet
                .Include(l => l.Trip)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Location>> GetByTripIdAsync(int tripId) =>
            await _dbSet
                .Where(l => l.TripId == tripId)
                .ToListAsync();
    }
}