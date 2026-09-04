using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services.Work
{
    public class WorkAuthService : IWorkAuthService
    {
        private readonly IUnitOfWork _uow;
        private readonly ITokenService _tokenService;
        private readonly IPasswordService _passwordService;

        public WorkAuthService(
            IUnitOfWork uow,
            ITokenService tokenService,
            IPasswordService passwordService)
        {
            _uow = uow;
            _tokenService = tokenService;
            _passwordService = passwordService;
        }

        public async Task<WorkLoginResponseDto> LoginAsync(LoginRequestDto dto)
        {
            var user = await _uow.WorkUsers.GetByEmailAsync(dto.Email)
                ?? throw new UnauthorizedAccessException("Invalid email or password");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is deactivated");

            if (!_passwordService.VerifyPassword(dto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password");

            return await GenerateAuthResponseAsync(user);
        }

        public async Task<WorkLoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto)
        {
            var existingToken = await _uow.RefreshTokens.GetByTokenAsync(dto.RefreshToken)
                ?? throw new UnauthorizedAccessException("Invalid refresh token");

            if (existingToken.UserType != UserType.Work)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (!existingToken.IsActive)
                throw new UnauthorizedAccessException("Refresh token is expired or revoked");

            var user = await _uow.WorkUsers.GetByIdAsync(existingToken.UserId)
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
                UserType = UserType.Work
            };

            existingToken.ReplacedByToken = newRefreshToken.Token;
            await _uow.RefreshTokens.AddAsync(newRefreshToken);
            await _uow.SaveChangesAsync();

            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Username, UserType.Work);

            return new WorkLoginResponseDto
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

            if (existingToken.UserType != UserType.Work)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (!existingToken.IsActive)
                throw new UnauthorizedAccessException("Refresh token is already revoked");

            existingToken.RevokedAt = DateTime.UtcNow;
            await _uow.SaveChangesAsync();
        }

        // --- private helpers ---

        private async Task<WorkLoginResponseDto> GenerateAuthResponseAsync(WorkUser user)
        {
            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Username, UserType.Work);
            var refreshTokenValue = _tokenService.GenerateRefreshToken();

            var refreshToken = new RefreshToken
            {
                Token = refreshTokenValue,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                UserId = user.Id,
                UserType = UserType.Work
            };

            await _uow.RefreshTokens.AddAsync(refreshToken);
            await _uow.SaveChangesAsync();

            return new WorkLoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = MapToDto(user)
            };
        }

        private static WorkUserDto MapToDto(WorkUser user) => new()
        {
            PublicId = user.PublicId,
            Username = user.Username,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}