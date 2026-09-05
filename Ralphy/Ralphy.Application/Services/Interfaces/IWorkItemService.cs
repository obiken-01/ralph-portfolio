using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Domain.Enums;

namespace Ralphy.Application.Services.Interfaces
{
    /// <summary>
    /// Follows the codebase's throwing convention rather than returning
    /// ApiResponse&lt;T&gt;: ExceptionMiddleware maps KeyNotFoundException to 404 and
    /// UnauthorizedAccessException to 403/401, so a refusal stays a real HTTP
    /// status instead of a 200 carrying a failure envelope.
    ///
    /// userId is always the caller's WorkUser id, resolved from the token's
    /// user_type claim — never a raw `sub`.
    /// </summary>
    public interface IWorkItemService
    {
        Task<PagedResult<WorkItemCardDto>> QueryAsync(int userId, WorkItemQueryDto query);

        Task<BoardDto> GetBoardAsync(int userId, Guid? projectPublicId, string? assignee);

        Task<WorkItemDetailDto> GetAsync(int userId, Guid publicId);

        Task<WorkItemDetailDto> CreateAsync(int userId, CreateWorkItemDto dto);

        Task<WorkItemDetailDto> UpdateAsync(int userId, Guid publicId, UpdateWorkItemDto dto);

        Task<WorkItemCardDto> MoveAsync(int userId, Guid publicId, MoveWorkItemDto dto);

        /// <summary>
        /// completedAt is for offline sync — a task finished on Monday and synced
        /// on Wednesday must report Monday. Null means the server clock.
        /// </summary>
        Task<WorkItemCardDto> SetStatusAsync(
            int userId, Guid publicId, WorkItemStatus status, DateTime? completedAt = null);

        Task<WorkItemCardDto> SetAssigneeAsync(int userId, Guid publicId, UpdateAssigneeDto dto);

        Task DeleteAsync(int userId, Guid publicId);

        Task<byte[]> ExportCsvAsync(int userId, WorkItemQueryDto query);
    }
}
