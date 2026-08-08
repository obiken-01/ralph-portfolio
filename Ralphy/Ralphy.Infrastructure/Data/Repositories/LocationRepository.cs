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

        // Posts has to be Include'd, not just referenced in the predicate.
        // `Where(l => l.Posts.Any(...))` compiles to a SQL EXISTS, so filtering
        // works without loading anything — but LocationDto.PostCount maps from
        // src.Posts.Count(...), and an unloaded collection counts as zero. That
        // is how every pin on the map came to report "0 posts".
        public async Task<IEnumerable<Location>> GetAllLocationsAsync() =>
            await _dbSet
                .Include(l => l.Posts)
                .OrderBy(l => l.PlaceName)
                .ToListAsync();

        /// <summary>Places with at least one published post, excluding the placeholder.</summary>
        public async Task<IEnumerable<Location>> GetPublicAsync() =>
            await _dbSet
                .Include(l => l.Posts)
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