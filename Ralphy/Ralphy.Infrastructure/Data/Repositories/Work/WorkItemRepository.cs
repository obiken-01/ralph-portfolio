using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories.Work;
using Ralphy.Domain.Models.Work;

namespace Ralphy.Infrastructure.Data.Repositories.Work
{
    public class WorkItemRepository : IWorkItemRepository
    {
        private readonly AppDbContext _db;

        public WorkItemRepository(AppDbContext db) => _db = db;

        // ─────────────────────────────────────────────────────────────────
        // The only entry point into WorkItems. Private on purpose: every read
        // and every write below composes onto it, and nothing bypasses it.
        //
        // A work item is visible if:
        //   • it has no project and you created it, or
        //   • it belongs to a project you are a member of.
        // ─────────────────────────────────────────────────────────────────
        private IQueryable<WorkItem> VisibleTo(int userId) =>
            _db.WorkItems.Where(w =>
                (w.ProjectId == null && w.CreatedByUserId == userId) ||
                (w.ProjectId != null && w.Project!.Members.Any(m => m.WorkUserId == userId)));

        public async Task<(IReadOnlyList<WorkItem> Items, int Total)> QueryAsync(
            int userId, WorkItemQuery q, CancellationToken ct = default)
        {
            var query = VisibleTo(userId)
                .Include(w => w.Project)
                .Include(w => w.Assignee)
                .Include(w => w.WorkItemLabels).ThenInclude(wl => wl.Label)
                .AsQueryable();

            if (q.ProjectId is not null) query = query.Where(w => w.ProjectId == q.ProjectId);
            if (q.Status is not null) query = query.Where(w => w.Status == q.Status);
            if (q.Priority is not null) query = query.Where(w => w.Priority == q.Priority);
            if (q.LabelId is not null) query = query.Where(w => w.WorkItemLabels.Any(l => l.LabelId == q.LabelId));
            if (q.AssigneeUserId is not null) query = query.Where(w => w.AssigneeUserId == q.AssigneeUserId);
            if (q.UnassignedOnly) query = query.Where(w => w.AssigneeUserId == null);

            // DateOnly throughout — PostgreSQL rejects DateTimeKind.Unspecified,
            // which is the same class of bug as RAL-7. Nothing converts to
            // DateTime here because nothing needs to.
            if (q.From is { } from)
                query = query.Where(w => w.DueDate >= from || w.StartDate >= from);

            if (q.To is { } to)
                query = query.Where(w => w.StartDate <= to || w.DueDate <= to);

            if (!string.IsNullOrWhiteSpace(q.Search))
                query = ApplySearch(query, q.Search.Trim());

            var total = await query.CountAsync(ct);

            query = (q.SortBy, q.SortDir) switch
            {
                ("dueDate", "asc") => query.OrderBy(w => w.DueDate),
                ("dueDate", _) => query.OrderByDescending(w => w.DueDate),
                ("priority", "asc") => query.OrderBy(w => w.Priority),
                ("priority", _) => query.OrderByDescending(w => w.Priority),
                ("title", "asc") => query.OrderBy(w => w.Title),
                ("title", _) => query.OrderByDescending(w => w.Title),
                _ => query.OrderByDescending(w => w.CreatedAt)
            };

            var page = q.Page < 1 ? 1 : q.Page;
            var size = q.PageSize < 1 ? 25 : q.PageSize;

            var items = await query.Skip((page - 1) * size).Take(size).ToListAsync(ct);
            return (items, total);
        }

        public async Task<IReadOnlyList<WorkItem>> GetBoardAsync(
            int userId, int? projectId, int? assigneeUserId, CancellationToken ct = default)
        {
            var query = VisibleTo(userId)
                .Include(w => w.Assignee)
                .Include(w => w.WorkItemLabels).ThenInclude(wl => wl.Label)
                .Where(w => w.Status != WorkItemStatus.Cancelled);

            if (projectId is not null) query = query.Where(w => w.ProjectId == projectId);
            if (assigneeUserId is not null) query = query.Where(w => w.AssigneeUserId == assigneeUserId);

            return await query
                .OrderBy(w => w.Status)
                .ThenBy(w => w.BoardOrder)
                .ToListAsync(ct);
        }

        // Single-item fetch goes through the SAME predicate. Skipping it here
        // would mean a guessed GUID reads someone else's task.
        public Task<WorkItem?> GetByPublicIdAsync(int userId, Guid publicId, CancellationToken ct = default) =>
            VisibleTo(userId)
                .Include(w => w.Project)
                .Include(w => w.Assignee)
                .Include(w => w.CreatedBy)
                .Include(w => w.WorkItemLabels).ThenInclude(wl => wl.Label)
                // Filtered include: project membership grants sight of the task,
                // never of other people's hours.
                .Include(w => w.TimeLogs.Where(t => t.WorkUserId == userId))
                .FirstOrDefaultAsync(w => w.PublicId == publicId, ct);

        public Task<WorkItem?> GetForWriteAsync(int userId, Guid publicId, CancellationToken ct = default) =>
            VisibleTo(userId).FirstOrDefaultAsync(w => w.PublicId == publicId, ct);

        public async Task<int> GetNextBoardOrderAsync(
            int userId, WorkItemStatus status, int? projectId, CancellationToken ct = default)
        {
            var last = await VisibleTo(userId)
                .Where(w => w.Status == status && w.ProjectId == projectId)
                .Select(w => (int?)w.BoardOrder)
                .MaxAsync(ct);

            return (last ?? -1) + 1;
        }

        public async Task ReorderColumnAsync(
            int userId,
            WorkItemStatus status,
            int? projectId,
            Guid movedPublicId,
            int newIndex,
            CancellationToken ct = default)
        {
            // Both reads are scoped. The spec's version queried _db.WorkItems
            // directly, which for standalone items (projectId == null) matched
            // every user's private column and renumbered all of it.
            var moved = await VisibleTo(userId)
                .FirstOrDefaultAsync(w => w.PublicId == movedPublicId, ct)
                ?? throw new KeyNotFoundException("Work item not found");

            var column = await VisibleTo(userId)
                .Where(w => w.Status == status
                         && w.ProjectId == projectId
                         && w.PublicId != movedPublicId)
                .OrderBy(w => w.BoardOrder)
                .ToListAsync(ct);

            moved.Status = status;
            moved.ProjectId = projectId;

            column.Insert(Math.Clamp(newIndex, 0, column.Count), moved);

            for (var i = 0; i < column.Count; i++)
                column[i].BoardOrder = i;

            // SaveChanges is the caller's job (UnitOfWork). A
            // DbUpdateConcurrencyException there means someone else moved a card
            // first — that surfaces as 409, not 500.
        }

        public async Task AddAsync(WorkItem item, CancellationToken ct = default)
            => await _db.WorkItems.AddAsync(item, ct);

        public void Remove(WorkItem item)
            => _db.WorkItems.Remove(item);

        // --- private helpers ---

        /// <summary>
        /// ILike is Npgsql-only and does not translate on SQLite, where the test
        /// suite runs. The fallback matches the existing TimeLogRepository search.
        /// </summary>
        private IQueryable<WorkItem> ApplySearch(IQueryable<WorkItem> query, string search)
        {
            if (_db.Database.IsNpgsql())
            {
                var term = $"%{search}%";
                return query.Where(w => EF.Functions.ILike(w.Title, term)
                                     || EF.Functions.ILike(w.Summary ?? "", term));
            }

            var lower = search.ToLower();
            return query.Where(w => w.Title.ToLower().Contains(lower)
                                 || (w.Summary ?? "").ToLower().Contains(lower));
        }
    }
}
