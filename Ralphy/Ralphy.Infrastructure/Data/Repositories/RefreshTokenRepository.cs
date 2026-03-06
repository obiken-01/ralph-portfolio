using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class RefreshTokenRepository : BaseRepository<RefreshToken>, IRefreshTokenRepository
    {
        public RefreshTokenRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<RefreshToken?> GetByTokenAsync(string token) =>
            await _dbSet
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == token);

        public async Task<IEnumerable<RefreshToken>> GetActiveTokensByUserIdAsync(int userId) =>
            await _dbSet
                .Where(rt => rt.UserId == userId
                    && rt.RevokedAt == null
                    && rt.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

        public async Task RevokeAllUserTokensAsync(int userId)
        {
            var activeTokens = await GetActiveTokensByUserIdAsync(userId);
            foreach (var token in activeTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
                _dbSet.Update(token);
            }
        }
    }
}