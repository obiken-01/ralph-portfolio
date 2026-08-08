using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
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
                .OrderBy(l => l.PlaceName)
                .ToListAsync();

        /// <summary>Places with at least one published post, excluding the placeholder.</summary>
        public async Task<IEnumerable<Location>> GetPublicAsync() =>
            await _dbSet
                .Where(l => !l.IsPlaceholder
                    && l.Posts.Any(p => p.Status == PostStatus.Published))
                .OrderBy(l => l.PlaceName)
                .ToListAsync();

        public async Task<bool> HasPostsAsync(int locationId) =>
            await _dbSet
                .Where(l => l.Id == locationId)
                .AnyAsync(l => l.Posts.Any());

        public async Task<Location?> GetPlaceholderAsync() =>
            await _dbSet.FirstOrDefaultAsync(l => l.IsPlaceholder);
    }
}