using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);

        /// <summary>
        /// <paramref name="userType"/> is not optional on purpose: the caller has to
        /// say which identity space it is minting a token for, because the resulting
        /// claim is the only thing that keeps the two apart at the authorization layer.
        /// </summary>
        string GenerateAccessToken(int userId, string email, string username, UserType userType);

        string GenerateRefreshToken();

        int GetUserIdFromToken(string token);
    }
}
