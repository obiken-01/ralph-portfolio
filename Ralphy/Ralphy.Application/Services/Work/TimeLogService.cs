using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces;
using System.Text;

namespace Ralphy.Application.Services.Work
{
    public class TimeLogService : ITimeLogService
    {
        private readonly IUnitOfWork _uow;

        public TimeLogService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<PagedTimeLogResultDto> GetFilteredAsync(Guid userPublicId, TimeLogQueryDto query)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var (items, totalCount) = await _uow.TimeLogs.GetFilteredAsync(
                user.Id,
                query.From,
                query.To,
                query.Search,
                await ResolveWorkItemIdAsync(user.Id, query.WorkItemId),
                query.SortBy,
                query.SortDir,
                query.Page,
                query.PageSize);

            return new PagedTimeLogResultDto
            {
                Items = items.Select(MapToDto),
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        public async Task<TimeLogDto> GetByIdAsync(Guid userPublicId, int id)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var log = await _uow.TimeLogs.GetByIdAsync(id, user.Id)
                ?? throw new KeyNotFoundException("Time log not found");

            return MapToDto(log);
        }

        public async Task<TimeLogDto> CreateAsync(Guid userPublicId, CreateTimeLogDto dto)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var log = new TimeLog
            {
                TaskDescription = dto.TaskDescription,
                LoggedAt = dto.LoggedAt,
                WorkUserId = user.Id,
                Duration = dto.Duration,
                WorkItemId = await ResolveWorkItemIdAsync(user.Id, dto.WorkItemId)
            };

            await _uow.TimeLogs.AddAsync(log);
            await _uow.SaveChangesAsync();

            // Re-read so the WorkItem navigation is populated; the tracked entity
            // has the FK but not the title the caller is about to render.
            return await GetByIdAsync(userPublicId, log.Id);
        }

        public async Task<TimeLogDto> UpdateAsync(Guid userPublicId, int id, UpdateTimeLogDto dto)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var log = await _uow.TimeLogs.GetByIdAsync(id, user.Id)
                ?? throw new KeyNotFoundException("Time log not found");

            log.TaskDescription = dto.TaskDescription;
            log.Duration = dto.Duration;
            log.LoggedAt = dto.LoggedAt;
            log.WorkItemId = await ResolveWorkItemIdAsync(user.Id, dto.WorkItemId);
            log.UpdatedAt = DateTime.UtcNow;

            _uow.TimeLogs.Update(log);
            await _uow.SaveChangesAsync();

            return await GetByIdAsync(userPublicId, log.Id);
        }

        public async Task DeleteAsync(Guid userPublicId, int id)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var log = await _uow.TimeLogs.GetByIdAsync(id, user.Id)
                ?? throw new KeyNotFoundException("Time log not found");

            _uow.TimeLogs.Delete(log);
            await _uow.SaveChangesAsync();
        }

        public async Task<byte[]> ExportCsvAsync(Guid userPublicId, TimeLogQueryDto query)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var logs = await _uow.TimeLogs.GetForExportAsync(
                user.Id,
                query.From,
                query.To,
                query.Search,
                await ResolveWorkItemIdAsync(user.Id, query.WorkItemId),
                query.SortBy,
                query.SortDir);

            var sb = new StringBuilder();
            sb.AppendLine("LoggedAt,Duration (hrs),TaskDescription");

            foreach (var log in logs)
            {
                var loggedAt = log.LoggedAt.ToString("yyyy-MM-dd HH:mm");
                var description = log.TaskDescription.Replace("\"", "\"\"");
                sb.AppendLine($"\"{loggedAt}\",\"{log.Duration}\",\"{description}\"");
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        // --- private helpers ---

        /// <summary>
        /// Turns a public task id into an internal one, refusing any task the
        /// caller cannot see. Without this, booking hours against a guessed GUID
        /// would attach your time to a stranger's task — and their task detail
        /// would then show a row it has no business showing.
        /// </summary>
        private async Task<int?> ResolveWorkItemIdAsync(int workUserId, Guid? workItemPublicId)
        {
            if (workItemPublicId is null)
                return null;

            var item = await _uow.WorkItems.GetForWriteAsync(workUserId, workItemPublicId.Value)
                ?? throw new KeyNotFoundException("Work item not found");

            return item.Id;
        }

        private async Task<WorkUser> GetUserOrThrowAsync(Guid publicId)
        {
            return await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");
        }

        private static TimeLogDto MapToDto(TimeLog log) => new()
        {
            Id = log.Id,
            TaskDescription = log.TaskDescription,
            Duration = log.Duration,
            LoggedAt = log.LoggedAt,
            WorkItemId = log.WorkItem?.PublicId,
            WorkItemTitle = log.WorkItem?.Title,
            CreatedAt = log.CreatedAt
        };
    }
}