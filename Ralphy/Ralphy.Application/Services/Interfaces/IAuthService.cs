using Ralphy.Application.DTOs.Auth;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponseDto> RegisterAsync(RegisterRequestDto request);

        Task<LoginResponseDto> LoginAsync(LoginRequestDto request);

        Task<LoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request);

        Task RevokeTokenAsync(string refreshToken);
    }
}