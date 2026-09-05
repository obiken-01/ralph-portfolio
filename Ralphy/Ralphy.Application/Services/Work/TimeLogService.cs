using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Exceptions;
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

            // An outbox replaying a create whose first response was lost must not
            // book the hours twice. Scoped to the caller so a colliding GUID from
            // another account can never resolve to their row.
            if (dto.PublicId is not null)
            {
                var existing = await _uow.TimeLogs.GetByPublicIdAsync(dto.PublicId.Value, user.Id);
                if (existing is not null)
                    return MapToDto(existing);
            }

            var log = new TimeLog
            {
                PublicId = dto.PublicId ?? Guid.NewGuid(),
                TaskDescription = dto.TaskDescription,
                LoggedAt = Normalise(dto.LoggedAt),
                WorkUserId = user.Id,
                Duration = dto.Duration,
                WorkItemId = await ResolveWorkItemIdAsync(user.Id, dto.WorkItemId)
            };

            await _uow.TimeLogs.AddAsync(log);

            try
            {
                await _uow.SaveChangesAsync();
            }
            catch (DuplicateKeyException)
            {
                // Two retries raced and both cleared the check above; the unique
                // index settled it. Return whichever one won rather than failing
                // the client — the outcome it wanted has already happened.
                var winner = await _uow.TimeLogs.GetByPublicIdAsync(log.PublicId, user.Id);
                if (winner is not null)
                    return MapToDto(winner);

                // Nothing readable under our own id means the GUID belongs to a
                // different account. Not idempotency — a genuine collision.
                throw;
            }

            // Re-read so the WorkItem navigation is populated; the tracked entity
            // has the FK but not the title the caller is about to render.
            return await GetByIdAsync(userPublicId, log.Id);
        }

        public async Task<TimeLogDto> UpdateAsync(Guid userPublicId, int id, UpdateTimeLogDto dto)
        {
            var user = await GetUserOrThrowAsync(userPublicId);

            var log = await _uow.TimeLogs.GetByIdAsync(id, user.Id)
                ?? throw new KeyNotFoundException("Time log not found");

            EnsureNotStale(log, dto.ExpectedUpdatedAt);

            log.TaskDescription = dto.TaskDescription;
            log.Duration = dto.Duration;
            log.LoggedAt = Normalise(dto.LoggedAt);
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
        /// Forces a client timestamp to UTC.
        ///
        /// LoggedAt has no explicit column type, so Npgsql maps it timestamptz,
        /// which rejects DateTimeKind.Unspecified outright. Today's clients send a
        /// Z suffix and never hit it; a replayed offline timestamp that lost the
        /// suffix somewhere in storage would be a 500 rather than a 400. Local
        /// times are converted, not relabelled — relabelling would silently shift
        /// the log by the offset.
        /// </summary>
        private static DateTime Normalise(DateTime value) => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

        /// <summary>
        /// Refuses an edit made against a snapshot the server has since moved past.
        ///
        /// UpdatedAt is null until a record is first edited, so the comparison runs
        /// against CreatedAt in that case — comparing against a null UpdatedAt
        /// evaluates false and would wave through every conflict on a
        /// never-edited record, which is most of them.
        /// </summary>
        private void EnsureNotStale(TimeLog log, DateTime? expectedUpdatedAt)
        {
            if (expectedUpdatedAt is null)
                return;

            var lastModified = log.UpdatedAt ?? log.CreatedAt;

            // A second of slack: PostgreSQL timestamptz and .NET DateTime do not
            // round-trip at the same precision, and an exact comparison invents
            // conflicts that are not there.
            if (lastModified > Normalise(expectedUpdatedAt.Value).AddSeconds(1))
                throw new ConflictException(
                    "This time log was changed since you last saw it.",
                    MapToDto(log));
        }

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
            PublicId = log.PublicId,
            TaskDescription = log.TaskDescription,
            Duration = log.Duration,
            LoggedAt = log.LoggedAt,
            WorkItemId = log.WorkItem?.PublicId,
            WorkItemTitle = log.WorkItem?.Title,
            CreatedAt = log.CreatedAt
        };
    }
}