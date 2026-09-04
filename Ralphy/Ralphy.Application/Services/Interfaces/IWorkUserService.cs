using Ralphy.Application.DTOs.Work;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IWorkUserService
    {
        Task<IEnumerable<WorkUserDto>> GetAllAsync();

        Task<WorkUserDto> GetByPublicIdAsync(Guid publicId);

        Task<WorkUserDto> CreateAsync(CreateWorkUserDto dto);

        Task<WorkUserDto> UpdateAsync(Guid publicId, UpdateWorkUserDto dto);

        Task ResetPasswordAsync(Guid publicId, ResetWorkPasswordDto dto);

        Task ActivateAsync(Guid publicId);

        Task DeactivateAsync(Guid publicId);

        Task DeleteAsync(Guid publicId);
    }
}