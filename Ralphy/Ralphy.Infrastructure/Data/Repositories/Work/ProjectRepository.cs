using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories.Work;

namespace Ralphy.Infrastructure.Data.Repositories.Work
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly AppDbContext _db;

        public ProjectRepository(AppDbContext db) => _db = db;

        // A project is visible exactly when you are a member of it. Ownership is
        // not a separate case: the creator gets an Admin ProjectMember row in the
        // same transaction, so a project with no members is visible to nobody.
        private IQueryable<Project> VisibleTo(int userId) =>
            _db.Projects.Where(p => p.Members.Any(m => m.WorkUserId == userId));

        public async Task<IReadOnlyList<Project>> GetForUserAsync(
            int userId, ProjectStatus? status, string? search, CancellationToken ct = default)
        {
            var query = VisibleTo(userId)
                .Include(p => p.Members)
                .Include(p => p.WorkItems)
                .AsQueryable();

            if (status is not null)
                query = query.Where(p => p.Status == status);

            if (!string.IsNullOrWhiteSpace(search))
                query = ApplySearch(query, search.Trim());

            return await query
                .OrderBy(p => p.DisplayOrder)
                .ThenByDescending(p => p.CreatedAt)
                .ToListAsync(ct);
        }

        public Task<Project?> GetByPublicIdAsync(int userId, Guid publicId, CancellationToken ct = default) =>
            VisibleTo(userId)
                .Include(p => p.Owner)
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Include(p => p.Milestones)
                .Include(p => p.WorkItems)
                .FirstOrDefaultAsync(p => p.PublicId == publicId, ct);

        public Task<Project?> GetWithTimelineAsync(int userId, Guid publicId, CancellationToken ct = default) =>
            VisibleTo(userId)
                .Include(p => p.Milestones)
                .Include(p => p.WorkItems).ThenInclude(w => w.Assignee)
                .FirstOrDefaultAsync(p => p.PublicId == publicId, ct);

        /// <summary>
        /// Null means "not a member", which is the same answer as "no such
        /// project" as far as the caller is concerned — do not leak the difference.
        /// </summary>
        public async Task<ProjectRole?> GetRoleAsync(int userId, int projectId, CancellationToken ct = default)
        {
            var member = await _db.ProjectMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.WorkUserId == userId, ct);

            return member?.Role;
        }

        public async Task<IReadOnlyList<ProjectMember>> GetMembersAsync(
            int projectId, CancellationToken ct = default) =>
            await _db.ProjectMembers
                .Include(m => m.User)
                .Where(m => m.ProjectId == projectId)
                .OrderByDescending(m => m.Role)
                .ThenBy(m => m.User.Username)
                .ToListAsync(ct);

        public async Task AddAsync(Project project, CancellationToken ct = default)
            => await _db.Projects.AddAsync(project, ct);

        public void Remove(Project project)
            => _db.Projects.Remove(project);

        // --- private helpers ---

        /// <summary>ILike is Npgsql-only; SQLite (the test provider) needs the fallback.</summary>
        private IQueryable<Project> ApplySearch(IQueryable<Project> query, string search)
        {
            if (_db.Database.IsNpgsql())
            {
                var term = $"%{search}%";
                return query.Where(p => EF.Functions.ILike(p.Name, term)
                                     || EF.Functions.ILike(p.Description ?? "", term));
            }

            var lower = search.ToLower();
            return query.Where(p => p.Name.ToLower().Contains(lower)
                                 || (p.Description ?? "").ToLower().Contains(lower));
        }
    }
}
