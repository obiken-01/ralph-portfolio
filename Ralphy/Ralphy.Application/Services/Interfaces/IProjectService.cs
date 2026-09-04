using Ralphy.Application.DTOs.Work.Projects;
using Ralphy.Domain.Enums;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IProjectService
    {
        Task<IEnumerable<ProjectListItemDto>> GetAllAsync(int userId, ProjectStatus? status, string? search);

        Task<ProjectDetailDto> GetAsync(int userId, Guid publicId);

        Task<ProjectTimelineDto> GetTimelineAsync(int userId, Guid publicId);

        Task<ProjectDetailDto> CreateAsync(int userId, CreateProjectDto dto);

        Task<ProjectDetailDto> UpdateAsync(int userId, Guid publicId, UpdateProjectDto dto);

        Task DeleteAsync(int userId, Guid publicId);

        Task<IEnumerable<ProjectMemberDto>> GetMembersAsync(int userId, Guid publicId);

        Task<ProjectMemberDto> AddMemberAsync(int userId, Guid publicId, AddProjectMemberDto dto);

        Task<ProjectMemberDto> UpdateMemberRoleAsync(
            int userId, Guid publicId, Guid memberPublicId, UpdateMemberRoleDto dto);

        Task RemoveMemberAsync(int userId, Guid publicId, Guid memberPublicId);
    }
}
