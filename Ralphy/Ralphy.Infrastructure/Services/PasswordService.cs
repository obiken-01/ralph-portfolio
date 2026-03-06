using Ralphy.Domain.Interfaces;

namespace Ralphy.Infrastructure.Services
{
    public class PasswordService : IPasswordService
    {
        public string HashPassword(string password) =>
            BCrypt.Net.BCrypt.HashPassword(password);

        public bool VerifyPassword(string password, string hash) =>
            BCrypt.Net.BCrypt.Verify(password, hash);
    }
}