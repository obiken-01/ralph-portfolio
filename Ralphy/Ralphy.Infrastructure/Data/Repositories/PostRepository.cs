using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class PostRepository : BaseRepository<Post>, IPostRepository
    {
        public PostRepository(AppDbContext context) : base(context) { }

        // Photos, tags and location are read by every card. Loading them here
        // is the difference between one query and one-per-post.
        private IQueryable<Post> WithCardData() =>
            _dbSet
                .Include(p => p.Photos)
                .Include(p => p.Location)
                .Include(p => p.PostTags)
                    .ThenInclude(pt => pt.Tag);

        public async Task<IEnumerable<Post>> GetAllPublishedAsync() =>
            await WithCardData()
                .Where(p => p.Status == PostStatus.Published)
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();

        /// <summary>Admin listing — drafts included.</summary>
        public override async Task<IEnumerable<Post>> GetAllAsync() =>
            await WithCardData()
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

        public async Task<Post?> GetPostWithDetailsAsync(int id) =>
            await _dbSet
                .Include(p => p.Photos)
                .Include(p => p.Comments)
                .Include(p => p.Location)
                .Include(p => p.PostTags)
                    .ThenInclude(pt => pt.Tag)
                .FirstOrDefaultAsync(p => p.Id == id);

        public async Task<IEnumerable<Post>> GetByTagAsync(string tagName)
        {
            var normalized = tagName.ToLower().Trim();

            return await WithCardData()
                .Where(p => p.Status == PostStatus.Published
                    && p.PostTags.Any(pt => pt.Tag.Name == normalized))
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetByLocationIdAsync(int locationId) =>
            await WithCardData()
                .Where(p => p.LocationId == locationId
                    && p.Status == PostStatus.Published)
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();

        public async Task<IEnumerable<Post>> GetByTripIdAsync(int tripId) =>
            await WithCardData()
                .Where(p => p.TripId == tripId
                    && p.Status == PostStatus.Published)
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();

        public async Task IncrementViewCountAsync(int postId)
        {
            var post = await _dbSet.FindAsync(postId);
            if (post != null)
            {
                post.ViewCount++;
                _context.Update(post);
            }
        }

        /// <summary>
        /// Keeps Post.TakenAt in step with the earliest EXIF timestamp on its
        /// photos, so timeline grouping reflects when a shot was taken rather
        /// than when it was uploaded.
        /// </summary>
        public async Task RecalculateTakenAtAsync(int postId)
        {
            var post = await _dbSet.FindAsync(postId);
            if (post == null) return;

            post.TakenAt = await _context.Photos
                .Where(ph => ph.PostId == postId && ph.TakenAt != null)
                .MinAsync(ph => (DateTime?)ph.TakenAt);

            _context.Update(post);
        }
    }
}
