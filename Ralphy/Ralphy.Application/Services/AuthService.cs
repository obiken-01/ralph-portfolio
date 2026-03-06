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

        public Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
            => throw new NotImplementedException();

        public Task<LoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request)
            => throw new NotImplementedException();

        public Task RevokeTokenAsync(string refreshToken)
            => throw new NotImplementedException();
    }
}
