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

        // SortOrder is the display order; creation order is not.
        // Id breaks ties so the sequence is stable across reads.
        public async Task<IEnumerable<Photo>> GetByPostIdAsync(int postId) =>
            await _dbSet
                .Where(p => p.PostId == postId)
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.Id)
                .ToListAsync();
    }
}