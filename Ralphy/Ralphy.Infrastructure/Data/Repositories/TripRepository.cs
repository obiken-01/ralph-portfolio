using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class TripRepository : BaseRepository<Trip>, ITripRepository
    {
        public TripRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Trip>> GetAllPublishedAsync() =>
            await _dbSet
                .Where(t => t.Status == PostStatus.Published)
                .Include(t => t.Posts)
                .OrderByDescending(t => t.StartDate)
                .ToListAsync();

        public async Task<Trip?> GetTripWithPostsAsync(int id) =>
            await _dbSet
                .Include(t => t.Posts)
                .Include(t => t.Locations)
                .FirstOrDefaultAsync(t => t.Id == id);

        public async Task<IEnumerable<Trip>> GetByUserIdAsync(int userId) =>
            await _dbSet
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
    }
}