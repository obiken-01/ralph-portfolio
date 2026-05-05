using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);

        string GenerateAccessToken(int userId, string email, string username);

        string GenerateRefreshToken();

        int GetUserIdFromToken(string token);
    }
}