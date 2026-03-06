using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);

        string GenerateRefreshToken();

        int GetUserIdFromToken(string token);
    }
}