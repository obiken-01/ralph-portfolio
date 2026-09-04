using Ralphy.Application.DTOs.Work.Tokens;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace Ralphy.Application.Services.Work
{
    public class PatService : IPatService
    {
        private const string TokenPrefix = "rpat_";
        private const int TokenBytes = 32;

        private readonly IUnitOfWork _uow;

        public PatService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<IEnumerable<PatDto>> GetAllAsync(int userId)
        {
            var tokens = await _uow.PersonalAccessTokens.GetForUserAsync(userId);
            return tokens.Select(MapToDto).ToList();
        }

        public async Task<CreatedPatDto> CreateAsync(int userId, CreatePatDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("A token needs a name so you can tell them apart later.");

            var scopes = (dto.Scopes ?? new List<string>())
                .Select(s => s.Trim().ToLowerInvariant())
                .Where(s => s.Length > 0)
                .Distinct()
                .ToList();

            if (scopes.Count == 0)
                throw new ArgumentException("A token needs at least one scope.");

            var unknown = scopes.Where(s => !PatScopes.All.Contains(s)).ToList();
            if (unknown.Count > 0)
                throw new ArgumentException($"Unknown scope(s): {string.Join(", ", unknown)}");

            if (dto.ExpiresAt is not null && dto.ExpiresAt <= DateTime.UtcNow)
                throw new ArgumentException("The expiry date is already in the past.");

            var raw = Generate();

            var token = new PersonalAccessToken
            {
                Name = dto.Name.Trim(),
                TokenHash = Hash(raw),
                // Enough to recognise a token in a list, far too little to use.
                Prefix = raw[..(TokenPrefix.Length + 4)],
                Scopes = string.Join(",", scopes),
                ExpiresAt = dto.ExpiresAt,
                WorkUserId = userId,
            };

            await _uow.PersonalAccessTokens.AddAsync(token);
            await _uow.SaveChangesAsync();

            var dtoOut = MapToDto(token);

            return new CreatedPatDto
            {
                Id = dtoOut.Id,
                Name = dtoOut.Name,
                Prefix = dtoOut.Prefix,
                Scopes = dtoOut.Scopes,
                ExpiresAt = dtoOut.ExpiresAt,
                LastUsedAt = dtoOut.LastUsedAt,
                RevokedAt = dtoOut.RevokedAt,
                IsActive = dtoOut.IsActive,
                CreatedAt = dtoOut.CreatedAt,
                Token = raw,
            };
        }

        public async Task RevokeAsync(int userId, int id)
        {
            // Scoped to the caller: you can only revoke your own credentials.
            var token = await _uow.PersonalAccessTokens.GetByIdAsync(id, userId)
                ?? throw new KeyNotFoundException("Token not found");

            if (token.RevokedAt is not null)
                throw new InvalidOperationException("That token is already revoked.");

            token.RevokedAt = DateTime.UtcNow;
            token.UpdatedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();
        }

        // --- token mechanics ---

        /// <summary>rpat_ plus 32 random bytes, base64url so it survives a header.</summary>
        private static string Generate()
        {
            var bytes = RandomNumberGenerator.GetBytes(TokenBytes);

            var body = Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');

            return TokenPrefix + body;
        }

        /// <summary>
        /// SHA-256, not a password hash: this is a 256-bit random secret, not a
        /// guessable phrase, so there is nothing for a slow KDF to defend against
        /// and lookup happens on every request.
        /// </summary>
        public static string Hash(string raw) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

        private static PatDto MapToDto(PersonalAccessToken token) => new()
        {
            Id = token.Id,
            Name = token.Name,
            Prefix = token.Prefix,
            Scopes = token.Scopes
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList(),
            ExpiresAt = token.ExpiresAt,
            LastUsedAt = token.LastUsedAt,
            RevokedAt = token.RevokedAt,
            IsActive = token.IsActive,
            CreatedAt = token.CreatedAt,
        };
    }
}
