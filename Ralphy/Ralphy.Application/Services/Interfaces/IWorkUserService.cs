using Ralphy.Application.DTOs.Work;
using Ralphy.Application.DTOs.Work.Directory;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IWorkUserService
    {
        Task<IEnumerable<WorkUserDto>> GetAllAsync();

        /// <summary>
        /// The thin shape for assignee and member pickers. GetAllAsync is behind
        /// the Ralphy admin policy and exposes more than a picker should.
        /// </summary>
        Task<IEnumerable<WorkUserDirectoryDto>> GetDirectoryAsync();

        Task<WorkUserDto> GetByPublicIdAsync(Guid publicId);

        Task<WorkUserDto> CreateAsync(CreateWorkUserDto dto);

        Task<WorkUserDto> UpdateAsync(Guid publicId, UpdateWorkUserDto dto);

        Task ResetPasswordAsync(Guid publicId, ResetWorkPasswordDto dto);

        Task ActivateAsync(Guid publicId);

        Task DeactivateAsync(Guid publicId);

        Task DeleteAsync(Guid publicId);
    }
}