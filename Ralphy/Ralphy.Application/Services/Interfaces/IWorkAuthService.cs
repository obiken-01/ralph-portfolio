using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Work;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IWorkAuthService
    {
        Task<WorkLoginResponseDto> LoginAsync(LoginRequestDto dto);

        Task<WorkLoginResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto);

        Task RevokeTokenAsync(string refreshToken);
    }
}