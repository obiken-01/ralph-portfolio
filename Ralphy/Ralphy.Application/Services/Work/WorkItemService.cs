using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Labels;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Models.Work;
using System.Text;

namespace Ralphy.Application.Services.Work
{
    public class WorkItemService : IWorkItemService
    {
        private readonly IUnitOfWork _uow;

        public WorkItemService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<PagedResult<WorkItemCardDto>> QueryAsync(int userId, WorkItemQueryDto dto)
        {
            var query = await ToDomainQueryAsync(userId, dto);
            var (items, total) = await _uow.WorkItems.QueryAsync(userId, query);

            return new PagedResult<WorkItemCardDto>
            {
                Items = items.Select(MapToCard).ToList(),
                TotalCount = total,
                Page = query.Page,
                PageSize = query.PageSize,
            };
        }

        public async Task<BoardDto> GetBoardAsync(int userId, Guid? projectPublicId, string? assignee)
        {
            var projectId = projectPublicId is null
                ? (int?)null
                : (await GetVisibleProjectOrThrowAsync(userId, projectPublicId.Value)).Id;

            var (assigneeUserId, unassignedOnly) = await ResolveAssigneeFilterAsync(userId, assignee);

            var items = await _uow.WorkItems.GetBoardAsync(userId, projectId, assigneeUserId);

            if (unassignedOnly)
                items = items.Where(w => w.AssigneeUserId is null).ToList();

            // Every status gets a column, empty ones included — the board renders
            // from this response, not from a hardcoded list.
            var columns = Enum.GetValues<WorkItemStatus>()
                .Where(s => s != WorkItemStatus.Cancelled)
                .Select(status =>
                {
                    var cards = items
                        .Where(w => w.Status == status)
                        .OrderBy(w => w.BoardOrder)
                        .Select(MapToCard)
                        .ToList();

                    return new BoardColumnDto
                    {
                        Status = status.ToString(),
                        DisplayName = DisplayNameFor(status),
                        Count = cards.Count,
                        Items = cards,
                    };
                })
                .ToList();

            return new BoardDto { Columns = columns };
        }

        public async Task<WorkItemDetailDto> GetAsync(int userId, Guid publicId)
        {
            var item = await _uow.WorkItems.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            return MapToDetail(item);
        }

        public async Task<WorkItemDetailDto> CreateAsync(int userId, CreateWorkItemDto dto)
        {
            int? projectId = null;

            if (dto.ProjectPublicId is not null)
            {
                var project = await GetVisibleProjectOrThrowAsync(userId, dto.ProjectPublicId.Value);
                await EnsureRoleAsync(userId, project.Id, ProjectRole.Member);
                projectId = project.Id;
            }

            var item = new WorkItem
            {
                Title = dto.Title.Trim(),
                Summary = dto.Summary,
                Description = dto.Description,
                Status = dto.Status,
                Priority = dto.Priority,
                StartDate = dto.StartDate,
                DueDate = dto.DueDate,
                ProjectId = projectId,
                CreatedByUserId = userId,
                AssigneeUserId = await ResolveAssigneeIdAsync(dto.AssigneePublicId, projectId),
                BoardOrder = await _uow.WorkItems.GetNextBoardOrderAsync(userId, dto.Status, projectId),
            };

            if (dto.Status == WorkItemStatus.Done)
                item.CompletedAt = DateTime.UtcNow;

            await ApplyLabelsAsync(item, dto.LabelIds);

            await _uow.WorkItems.AddAsync(item);
            await _uow.SaveChangesAsync();

            return await GetAsync(userId, item.PublicId);
        }

        public async Task<WorkItemDetailDto> UpdateAsync(int userId, Guid publicId, UpdateWorkItemDto dto)
        {
            // The read path is used here rather than GetForWriteAsync because the
            // label collection has to be loaded before it can be reconciled.
            var item = await _uow.WorkItems.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            await EnsureCanWriteAsync(userId, item);

            var targetProjectId = item.ProjectId;

            if (dto.ProjectPublicId is null)
            {
                // Detaching to standalone would make the item private to its
                // creator, silently removing it from everyone else's board.
                if (item.ProjectId is not null && item.CreatedByUserId != userId)
                    throw new UnauthorizedAccessException(
                        "Only the creator can detach this task from its project.");

                targetProjectId = null;
            }
            else
            {
                var project = await GetVisibleProjectOrThrowAsync(userId, dto.ProjectPublicId.Value);
                await EnsureRoleAsync(userId, project.Id, ProjectRole.Member);
                targetProjectId = project.Id;
            }

            item.Title = dto.Title.Trim();
            item.Summary = dto.Summary;
            item.Description = dto.Description;
            item.Priority = dto.Priority;
            item.StartDate = dto.StartDate;
            item.DueDate = dto.DueDate;
            item.ProjectId = targetProjectId;
            item.AssigneeUserId = await ResolveAssigneeIdAsync(dto.AssigneePublicId, targetProjectId);
            item.UpdatedAt = DateTime.UtcNow;

            ApplyStatus(item, dto.Status);
            await ApplyLabelsAsync(item, dto.LabelIds);

            await _uow.SaveChangesAsync();

            return await GetAsync(userId, item.PublicId);
        }

        public async Task<WorkItemCardDto> MoveAsync(int userId, Guid publicId, MoveWorkItemDto dto)
        {
            var item = await _uow.WorkItems.GetForWriteAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            await EnsureCanWriteAsync(userId, item);

            int? targetProjectId = null;

            if (dto.ProjectPublicId is not null)
            {
                // Seeing the source proves nothing about the destination. Without
                // this check a member of project A could push work into project B.
                var project = await GetVisibleProjectOrThrowAsync(userId, dto.ProjectPublicId.Value);
                await EnsureRoleAsync(userId, project.Id, ProjectRole.Member);
                targetProjectId = project.Id;
            }

            ApplyStatus(item, dto.Status);
            item.UpdatedAt = DateTime.UtcNow;

            await _uow.WorkItems.ReorderColumnAsync(
                userId, dto.Status, targetProjectId, publicId, dto.NewIndex);

            await _uow.SaveChangesAsync();

            var moved = await _uow.WorkItems.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            return MapToCard(moved);
        }

        public async Task<WorkItemCardDto> SetStatusAsync(int userId, Guid publicId, WorkItemStatus status)
        {
            var item = await _uow.WorkItems.GetForWriteAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            await EnsureCanWriteAsync(userId, item);

            ApplyStatus(item, status);
            item.BoardOrder = await _uow.WorkItems.GetNextBoardOrderAsync(userId, status, item.ProjectId);
            item.UpdatedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();

            var updated = await _uow.WorkItems.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            return MapToCard(updated);
        }

        public async Task<WorkItemCardDto> SetAssigneeAsync(int userId, Guid publicId, UpdateAssigneeDto dto)
        {
            var item = await _uow.WorkItems.GetForWriteAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            await EnsureCanWriteAsync(userId, item);

            item.AssigneeUserId = await ResolveAssigneeIdAsync(dto.AssigneePublicId, item.ProjectId);
            item.UpdatedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();

            var updated = await _uow.WorkItems.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            return MapToCard(updated);
        }

        public async Task DeleteAsync(int userId, Guid publicId)
        {
            var item = await _uow.WorkItems.GetForWriteAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Work item not found");

            await EnsureCanWriteAsync(userId, item);

            _uow.WorkItems.Remove(item);
            await _uow.SaveChangesAsync();
        }

        public async Task<byte[]> ExportCsvAsync(int userId, WorkItemQueryDto dto)
        {
            var query = await ToDomainQueryAsync(userId, dto);

            // Export ignores paging: the caller asked for the filtered set, not a page.
            query.Page = 1;
            query.PageSize = int.MaxValue;

            var (items, _) = await _uow.WorkItems.QueryAsync(userId, query);

            var sb = new StringBuilder();
            sb.AppendLine("Title,Status,Priority,Project,Assignee,StartDate,DueDate,Labels");

            foreach (var item in items)
            {
                var labels = string.Join("; ", item.WorkItemLabels.Select(wl => wl.Label.Name));

                sb.AppendLine(string.Join(",", new[]
                {
                    Csv(item.Title),
                    Csv(item.Status.ToString()),
                    Csv(item.Priority.ToString()),
                    Csv(item.Project?.Name ?? ""),
                    Csv(item.Assignee?.Username ?? ""),
                    Csv(item.StartDate?.ToString("yyyy-MM-dd") ?? ""),
                    Csv(item.DueDate?.ToString("yyyy-MM-dd") ?? ""),
                    Csv(labels),
                }));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        // --- authorisation ---

        /// <summary>
        /// Standalone items answer to their creator; project items answer to
        /// membership at Member or above. Visibility alone is not enough to write:
        /// a Viewer can see a project's tasks and must not be able to change them.
        /// </summary>
        private async Task EnsureCanWriteAsync(int userId, WorkItem item)
        {
            if (item.ProjectId is null)
            {
                if (item.CreatedByUserId != userId)
                    throw new UnauthorizedAccessException("This task belongs to someone else.");

                return;
            }

            await EnsureRoleAsync(userId, item.ProjectId.Value, ProjectRole.Member);
        }

        private async Task EnsureRoleAsync(int userId, int projectId, ProjectRole minimum)
        {
            var role = await _uow.Projects.GetRoleAsync(userId, projectId);

            if (role is null || role < minimum)
                throw new UnauthorizedAccessException(
                    $"This action requires the {minimum} role on the project.");
        }

        private async Task<Project> GetVisibleProjectOrThrowAsync(int userId, Guid publicId) =>
            await _uow.Projects.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Project not found");

        // --- private helpers ---

        private static void ApplyStatus(WorkItem item, WorkItemStatus status)
        {
            if (item.Status == status)
                return;

            item.Status = status;
            item.CompletedAt = status == WorkItemStatus.Done ? DateTime.UtcNow : null;
        }

        private async Task ApplyLabelsAsync(WorkItem item, List<int> labelIds)
        {
            var wanted = labelIds.Distinct().ToList();

            if (wanted.Count > 0)
            {
                var known = (await _uow.Labels.GetAllAsync()).Select(l => l.Id).ToHashSet();
                var unknown = wanted.Where(id => !known.Contains(id)).ToList();

                if (unknown.Count > 0)
                    throw new KeyNotFoundException($"Unknown label id(s): {string.Join(", ", unknown)}");
            }

            foreach (var stale in item.WorkItemLabels.Where(wl => !wanted.Contains(wl.LabelId)).ToList())
                item.WorkItemLabels.Remove(stale);

            foreach (var labelId in wanted.Where(id => item.WorkItemLabels.All(wl => wl.LabelId != id)))
                item.WorkItemLabels.Add(new WorkItemLabel { LabelId = labelId });
        }

        /// <summary>
        /// Resolves an assignee, and refuses one who is not on the project — an
        /// assignee who cannot see the task would never learn they had it.
        /// </summary>
        private async Task<int?> ResolveAssigneeIdAsync(Guid? assigneePublicId, int? projectId)
        {
            if (assigneePublicId is null)
                return null;

            var user = await _uow.WorkUsers.GetByPublicIdAsync(assigneePublicId.Value)
                ?? throw new KeyNotFoundException("Assignee not found");

            if (projectId is not null)
            {
                var role = await _uow.Projects.GetRoleAsync(user.Id, projectId.Value);

                if (role is null)
                    throw new InvalidOperationException(
                        "That person is not a member of this project.");
            }

            return user.Id;
        }

        private async Task<(int? AssigneeUserId, bool UnassignedOnly)> ResolveAssigneeFilterAsync(
            int userId, string? assignee)
        {
            if (string.IsNullOrWhiteSpace(assignee))
                return (null, false);

            if (assignee.Equals("me", StringComparison.OrdinalIgnoreCase))
                return (userId, false);

            if (assignee.Equals("unassigned", StringComparison.OrdinalIgnoreCase))
                return (null, true);

            if (!Guid.TryParse(assignee, out var publicId))
                throw new ArgumentException("Assignee must be \"me\", \"unassigned\", or a user id.");

            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("Assignee not found");

            return (user.Id, false);
        }

        private async Task<WorkItemQuery> ToDomainQueryAsync(int userId, WorkItemQueryDto dto)
        {
            var projectId = dto.ProjectPublicId is null
                ? (int?)null
                : (await GetVisibleProjectOrThrowAsync(userId, dto.ProjectPublicId.Value)).Id;

            var (assigneeUserId, unassignedOnly) = await ResolveAssigneeFilterAsync(userId, dto.Assignee);

            return new WorkItemQuery
            {
                ProjectId = projectId,
                Status = dto.Status,
                Priority = dto.Priority,
                LabelId = dto.LabelId,
                AssigneeUserId = assigneeUserId,
                UnassignedOnly = unassignedOnly,
                From = dto.From,
                To = dto.To,
                Search = dto.Search,
                Page = dto.Page < 1 ? 1 : dto.Page,
                PageSize = dto.PageSize is < 1 or > 200 ? 25 : dto.PageSize,
                SortBy = dto.SortBy,
                SortDir = dto.SortDir,
            };
        }

        private static string DisplayNameFor(WorkItemStatus status) => status switch
        {
            WorkItemStatus.InProgress => "In Progress",
            _ => status.ToString(),
        };

        private static string Csv(string value) => $"\"{value.Replace("\"", "\"\"")}\"";

        // --- mapping ---

        private static WorkItemCardDto MapToCard(WorkItem item) => new()
        {
            PublicId = item.PublicId,
            Title = item.Title,
            Summary = item.Summary,
            Status = item.Status.ToString(),
            Priority = item.Priority.ToString(),
            StartDate = item.StartDate,
            DueDate = item.DueDate,
            BoardOrder = item.BoardOrder,
            ProjectPublicId = item.Project?.PublicId,
            ProjectName = item.Project?.Name,
            ProjectColorHex = item.Project?.ColorHex,
            AssigneePublicId = item.Assignee?.PublicId,
            AssigneeDisplayName = item.Assignee?.Username,
            Labels = item.WorkItemLabels
                .Where(wl => wl.Label is not null)
                .Select(wl => new LabelDto
                {
                    Id = wl.Label.Id,
                    Name = wl.Label.Name,
                    ColorHex = wl.Label.ColorHex,
                })
                .OrderBy(l => l.Name)
                .ToList(),
        };

        private static WorkItemDetailDto MapToDetail(WorkItem item)
        {
            var card = MapToCard(item);

            // TimeLogs arrive already filtered to the caller by the repository.
            var logs = item.TimeLogs
                .OrderByDescending(t => t.LoggedAt)
                .Select(t => new LinkedTimeLogDto
                {
                    Id = t.Id,
                    TaskDescription = t.TaskDescription,
                    Duration = t.Duration,
                    LoggedAt = t.LoggedAt,
                })
                .ToList();

            return new WorkItemDetailDto
            {
                PublicId = card.PublicId,
                Title = card.Title,
                Summary = card.Summary,
                Status = card.Status,
                Priority = card.Priority,
                StartDate = card.StartDate,
                DueDate = card.DueDate,
                BoardOrder = card.BoardOrder,
                ProjectPublicId = card.ProjectPublicId,
                ProjectName = card.ProjectName,
                ProjectColorHex = card.ProjectColorHex,
                AssigneePublicId = card.AssigneePublicId,
                AssigneeDisplayName = card.AssigneeDisplayName,
                Labels = card.Labels,

                Description = item.Description,
                CompletedAt = item.CompletedAt,
                CreatedByPublicId = item.CreatedBy?.PublicId ?? Guid.Empty,
                CreatedByDisplayName = item.CreatedBy?.Username ?? string.Empty,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt,
                TotalHoursLogged = logs.Sum(l => l.Duration),
                TimeLogs = logs,
            };
        }
    }
}
