using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Ralphy.Infrastructure.Services
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;

        public TokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateAccessToken(User user)
        {
            // Try both formats
            var secretKey = _configuration["Jwt__SecretKey"]
                ?? _configuration["Jwt:SecretKey"]
                ?? throw new InvalidOperationException("JWT SecretKey is not configured");

            var issuer = _configuration["Jwt__Issuer"]
                ?? _configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException("JWT Issuer is not configured");

            var audience = _configuration["Jwt__Audience"]
                ?? _configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException("JWT Audience is not configured");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateAccessToken(int userId, string email, string username)
        {
            var secretKey = _configuration["Jwt__SecretKey"]
                ?? _configuration["Jwt:SecretKey"]
                ?? throw new InvalidOperationException("JWT SecretKey is not configured");

            var issuer = _configuration["Jwt__Issuer"]
                ?? _configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException("JWT Issuer is not configured");

            var audience = _configuration["Jwt__Audience"]
                ?? _configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException("JWT Audience is not configured");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(JwtRegisteredClaimNames.UniqueName, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        public int GetUserIdFromToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = tokenHandler.ReadJwtToken(token);
            var userIdClaim = jwtToken.Claims
                .FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub);

            return int.Parse(userIdClaim!.Value);
        }
    }
}