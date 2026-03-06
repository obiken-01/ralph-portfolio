using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IRefreshTokenRepository : IBaseRepository<RefreshToken>
    {
        Task<RefreshToken?> GetByTokenAsync(string token);

        Task<IEnumerable<RefreshToken>> GetActiveTokensByUserIdAsync(int userId);

        Task RevokeAllUserTokensAsync(int userId);
    }
}