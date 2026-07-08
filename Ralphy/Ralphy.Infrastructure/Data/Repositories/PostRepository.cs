using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class PostRepository : BaseRepository<Post>, IPostRepository
    {
        public PostRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Post>> GetAllPublishedAsync() =>
            await _dbSet
                .Include(p => p.Photos)
                .Where(p => p.Status == PostStatus.Published)
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();

        public async Task<Post?> GetPostWithDetailsAsync(int id) =>
            await _dbSet
                .Include(p => p.Photos)
                .Include(p => p.Comments)
                .Include(p => p.PostTags)
                    .ThenInclude(pt => pt.Tag)
                .Include(p => p.Trip)
                .FirstOrDefaultAsync(p => p.Id == id);

        public async Task<IEnumerable<Post>> GetByTripIdAsync(int tripId) =>
            await _dbSet
                .Include(p => p.Photos)
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
    }
}
