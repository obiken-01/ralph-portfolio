using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Timekeeping;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class TimekeepingAuthService : ITimekeepingAuthService
    {
        private readonly IUnitOfWork _uow;
        private readonly ITokenService _tokenService;
        private readonly IPasswordService _passwordService;

        public TimekeepingAuthService(
            IUnitOfWork uow,
            ITokenService tokenService,
            IPasswordService passwordService)
        {
            _uow = uow;
            _tokenService = tokenService;
            _passwordService = passwordService;
        }

        public async Task<TimekeepingLoginResponseDto> LoginAsync(LoginRequestDto dto)
        {
            var user = await _uow.TimekeepingUsers.GetByEmailAsync(dto.Email)
                ?? throw new UnauthorizedAccessException("Invalid email or password");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is deactivated");

            if (!_passwordService.VerifyPassword(dto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password");

            return await GenerateAuthResponseAsync(user);
        }

        public async Task<TimekeepingLoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto)
        {
            var existingToken = await _uow.RefreshTokens.GetByTokenAsync(dto.RefreshToken)
                ?? throw new UnauthorizedAccessException("Invalid refresh token");

            if (existingToken.UserType != UserType.Timekeeping)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (!existingToken.IsActive)
                throw new UnauthorizedAccessException("Refresh token is expired or revoked");

            var user = await _uow.TimekeepingUsers.GetByIdAsync(existingToken.UserId)
                ?? throw new UnauthorizedAccessException("User not found");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is deactivated");

            // Rotate refresh token
            existingToken.RevokedAt = DateTime.UtcNow;

            var newRefreshToken = new RefreshToken
            {
                Token = _tokenService.GenerateRefreshToken(),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                UserId = user.Id,
                UserType = UserType.Timekeeping
            };

            existingToken.ReplacedByToken = newRefreshToken.Token;
            await _uow.RefreshTokens.AddAsync(newRefreshToken);
            await _uow.SaveChangesAsync();

            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Username);

            return new TimekeepingLoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = MapToDto(user)
            };
        }

        public async Task RevokeTokenAsync(string refreshToken)
        {
            var existingToken = await _uow.RefreshTokens.GetByTokenAsync(refreshToken)
                ?? throw new UnauthorizedAccessException("Invalid refresh token");

            if (existingToken.UserType != UserType.Timekeeping)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (!existingToken.IsActive)
                throw new UnauthorizedAccessException("Refresh token is already revoked");

            existingToken.RevokedAt = DateTime.UtcNow;
            await _uow.SaveChangesAsync();
        }

        // --- private helpers ---

        private async Task<TimekeepingLoginResponseDto> GenerateAuthResponseAsync(TimekeepingUser user)
        {
            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Username);
            var refreshTokenValue = _tokenService.GenerateRefreshToken();

            var refreshToken = new RefreshToken
            {
                Token = refreshTokenValue,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                UserId = user.Id,
                UserType = UserType.Timekeeping
            };

            await _uow.RefreshTokens.AddAsync(refreshToken);
            await _uow.SaveChangesAsync();

            return new TimekeepingLoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = MapToDto(user)
            };
        }

        private static TimekeepingUserDto MapToDto(TimekeepingUser user) => new()
        {
            PublicId = user.PublicId,
            Username = user.Username,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}