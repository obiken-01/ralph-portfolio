using Ralphy.Application.DTOs.Timekeeping;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ITimekeepingUserService
    {
        Task<IEnumerable<TimekeepingUserDto>> GetAllAsync();

        Task<TimekeepingUserDto> GetByPublicIdAsync(Guid publicId);

        Task<TimekeepingUserDto> CreateAsync(CreateTimekeepingUserDto dto);

        Task<TimekeepingUserDto> UpdateAsync(Guid publicId, UpdateTimekeepingUserDto dto);

        Task ResetPasswordAsync(Guid publicId, ResetTimekeepingPasswordDto dto);

        Task ActivateAsync(Guid publicId);

        Task DeactivateAsync(Guid publicId);

        Task DeleteAsync(Guid publicId);
    }
}