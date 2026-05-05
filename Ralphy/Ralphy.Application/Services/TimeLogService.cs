using Ralphy.Application.DTOs.Timekeeping;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;
using System.Text;

namespace Ralphy.Application.Services
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
                TimekeepingUserId = user.Id
            };

            await _uow.TimeLogs.AddAsync(log);
            await _uow.SaveChangesAsync();

            return MapToDto(log);
        }

        public async Task<TimeLogDto> UpdateAsync(Guid userPublicId, int id, UpdateTimeLogDto dto)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var log = await _uow.TimeLogs.GetByIdAsync(id, user.Id)
                ?? throw new KeyNotFoundException("Time log not found");

            log.TaskDescription = dto.TaskDescription;
            log.LoggedAt = dto.LoggedAt;
            log.UpdatedAt = DateTime.UtcNow;

            _uow.TimeLogs.Update(log);
            await _uow.SaveChangesAsync();

            return MapToDto(log);
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
                query.SortBy,
                query.SortDir);

            var sb = new StringBuilder();
            sb.AppendLine("LoggedAt,TaskDescription");

            foreach (var log in logs)
            {
                var loggedAt = log.LoggedAt.ToString("yyyy-MM-dd HH:mm");
                var description = log.TaskDescription.Replace("\"", "\"\"");
                sb.AppendLine($"\"{loggedAt}\",\"{description}\"");
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        // --- private helpers ---

        private async Task<Domain.Entities.TimekeepingUser> GetUserOrThrowAsync(Guid publicId)
        {
            return await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");
        }

        private static TimeLogDto MapToDto(TimeLog log) => new()
        {
            Id = log.Id,
            TaskDescription = log.TaskDescription,
            LoggedAt = log.LoggedAt,
            CreatedAt = log.CreatedAt
        };
    }
}