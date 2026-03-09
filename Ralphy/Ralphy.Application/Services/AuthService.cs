using AutoMapper;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ITokenService _tokenService;
        private readonly IPasswordService _passwordService;
        private readonly IMapper _mapper;

        public AuthService(
            IUnitOfWork unitOfWork,
            ITokenService tokenService,
            IPasswordService passwordService,
            IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _tokenService = tokenService;
            _passwordService = passwordService;
            _mapper = mapper;
        }

        public async Task<LoginResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            // Check if email already exists
            if (await _unitOfWork.Users.EmailExistsAsync(request.Email))
                throw new InvalidOperationException("Email already exists");

            // Check if username already exists
            if (await _unitOfWork.Users.UsernameExistsAsync(request.Username))
                throw new InvalidOperationException("Username already exists");

            // Create user
            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = _passwordService.HashPassword(request.Password)
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            // Generate tokens
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            // Save refresh token to DB
            var refreshTokenEntity = new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            await _unitOfWork.RefreshTokens.AddAsync(refreshTokenEntity);
            await _unitOfWork.SaveChangesAsync();

            return new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = _mapper.Map<UserDto>(user)
            };
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
        {
            // Find user by email
            var user = await _unitOfWork.Users.GetByEmailAsync(request.Email);
            if (user == null)
                throw new UnauthorizedAccessException("Invalid email or password");

            // Verify password
            if (!_passwordService.VerifyPassword(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password");

            // Revoke all existing refresh tokens
            await _unitOfWork.RefreshTokens.RevokeAllUserTokensAsync(user.Id);

            // Generate new tokens
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            // Save new refresh token
            var refreshTokenEntity = new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            await _unitOfWork.RefreshTokens.AddAsync(refreshTokenEntity);
            await _unitOfWork.SaveChangesAsync();

            return new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = _mapper.Map<UserDto>(user)
            };
        }

        public async Task<LoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request)
        {
            // Find refresh token in DB
            var refreshToken = await _unitOfWork.RefreshTokens
                .GetByTokenAsync(request.RefreshToken);

            // Validate refresh token
            if (refreshToken == null)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (refreshToken.IsExpired)
                throw new UnauthorizedAccessException("Refresh token has expired");

            if (refreshToken.IsRevoked)
                throw new UnauthorizedAccessException("Refresh token has been revoked");

            // Get user
            var user = refreshToken.User;
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            // Revoke old refresh token
            refreshToken.RevokedAt = DateTime.UtcNow;

            // Generate new tokens
            var newAccessToken = _tokenService.GenerateAccessToken(user);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            // Link old token to new token (for token rotation tracking)
            refreshToken.ReplacedByToken = newRefreshToken;
            await _unitOfWork.RefreshTokens.UpdateAsync(refreshToken);

            // Save new refresh token
            var newRefreshTokenEntity = new RefreshToken
            {
                Token = newRefreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            await _unitOfWork.RefreshTokens.AddAsync(newRefreshTokenEntity);
            await _unitOfWork.SaveChangesAsync();

            return new LoginResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = _mapper.Map<UserDto>(user)
            };
        }

        public async Task RevokeTokenAsync(string refreshToken)
        {
            var token = await _unitOfWork.RefreshTokens
                .GetByTokenAsync(refreshToken);

            if (token == null)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (!token.IsActive)
                throw new UnauthorizedAccessException("Refresh token is already inactive");

            // Revoke token
            token.RevokedAt = DateTime.UtcNow;
            await _unitOfWork.RefreshTokens.UpdateAsync(token);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
