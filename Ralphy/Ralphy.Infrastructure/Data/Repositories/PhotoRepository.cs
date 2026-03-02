using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class PhotoRepository : BaseRepository<Photo>, IPhotoRepository
    {
        public PhotoRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Photo>> GetByPostIdAsync(int postId) =>
            await _dbSet
                .Where(p => p.PostId == postId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
    }
}