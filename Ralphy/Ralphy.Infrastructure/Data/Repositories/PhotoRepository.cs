using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class PhotoRepository : BaseRepository<Photo>, IPhotoRepository
    {
        public PhotoRepository(AppDbContext context) : base(context)
        {
        }

        // SortOrder is the display order; creation order is not.
        // Id breaks ties so the sequence is stable across reads.
        public async Task<IEnumerable<Photo>> GetByPostIdAsync(int postId) =>
            await _dbSet
                .Where(p => p.PostId == postId)
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.Id)
                .ToListAsync();

        /// <summary>
        /// Media uploaded before the app started recording dimensions.
        /// Ordered by Id so repeated batches walk forward deterministically
        /// instead of re-drawing the same rows.
        /// </summary>
        public async Task<IEnumerable<Photo>> GetMissingDimensionsAsync(int limit) =>
            await _dbSet
                .Where(p => p.Width == null || p.Height == null)
                .OrderBy(p => p.Id)
                .Take(limit)
                .ToListAsync();

        public async Task<int> CountMissingDimensionsAsync() =>
            await _dbSet.CountAsync(p => p.Width == null || p.Height == null);

        /// <summary>
        /// A random sample of images from published posts, for the home page.
        ///
        /// Ordering happens in the database rather than by pulling every row
        /// and shuffling in memory — the library only holds a few hundred
        /// photos today, but a feed that degrades as it grows is not worth
        /// shipping.
        /// </summary>
        public async Task<IEnumerable<Photo>> GetRandomPublishedAsync(int count) =>
            await _dbSet
                .Include(p => p.Post)
                    .ThenInclude(post => post.Location)
                .Where(p => p.Type == MediaType.Image
                    && p.Post.Status == PostStatus.Published)
                .OrderBy(_ => EF.Functions.Random())
                .Take(count)
                .ToListAsync();
    }
}
