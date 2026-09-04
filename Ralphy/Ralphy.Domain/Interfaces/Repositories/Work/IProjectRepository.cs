using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    public interface IProjectRepository
    {
        Task<IReadOnlyList<Project>> GetForUserAsync(
            int userId, ProjectStatus? status, string? search, CancellationToken ct = default);

        Task<Project?> GetByPublicIdAsync(int userId, Guid publicId, CancellationToken ct = default);

        /// <summary>Project plus its dated work items and milestones, for the Gantt view.</summary>
        Task<Project?> GetWithTimelineAsync(int userId, Guid publicId, CancellationToken ct = default);

        /// <summary>Null when the user is not a member — which is also "not visible".</summary>
        Task<ProjectRole?> GetRoleAsync(int userId, int projectId, CancellationToken ct = default);

        Task<IReadOnlyList<ProjectMember>> GetMembersAsync(int projectId, CancellationToken ct = default);

        Task AddAsync(Project project, CancellationToken ct = default);

        void Remove(Project project);
    }
}
