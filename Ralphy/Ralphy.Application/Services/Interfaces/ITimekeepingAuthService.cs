using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Timekeeping;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ITimekeepingAuthService
    {
        Task<TimekeepingLoginResponseDto> LoginAsync(LoginRequestDto dto);

        Task<TimekeepingLoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto);

        Task RevokeTokenAsync(string refreshToken);
    }
}