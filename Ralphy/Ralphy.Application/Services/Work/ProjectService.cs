using Ralphy.Application.DTOs.Work.Projects;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services.Work
{
    public class ProjectService : IProjectService
    {
        private readonly IUnitOfWork _uow;

        public ProjectService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<IEnumerable<ProjectListItemDto>> GetAllAsync(
            int userId, ProjectStatus? status, string? search)
        {
            var projects = await _uow.Projects.GetForUserAsync(userId, status, search);

            return projects.Select(p => MapToListItem(p, RoleOf(p, userId))).ToList();
        }

        public async Task<ProjectDetailDto> GetAsync(int userId, Guid publicId)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);
            return MapToDetail(project, RoleOf(project, userId));
        }

        public async Task<ProjectTimelineDto> GetTimelineAsync(int userId, Guid publicId)
        {
            var project = await _uow.Projects.GetWithTimelineAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Project not found");

            var live = project.WorkItems
                .Where(w => w.Status != WorkItemStatus.Cancelled)
                .ToList();

            // An item earns a bar only if it has at least one date. Defaulting the
            // undated to today produces a wall of zero-width bars stacked on the
            // same column, which is worse than showing nothing — they go in
            // UndatedItems instead so the UI can still list them.
            var dated = live.Where(w => w.StartDate is not null || w.DueDate is not null).ToList();
            var undated = live.Except(dated).ToList();

            var starts = dated.Select(w => w.StartDate ?? w.DueDate!.Value).ToList();
            var ends = dated.Select(w => w.DueDate ?? w.StartDate!.Value).ToList();

            if (project.StartDate is not null) starts.Add(project.StartDate.Value);
            if (project.TargetEndDate is not null) ends.Add(project.TargetEndDate.Value);

            foreach (var milestone in project.Milestones)
            {
                starts.Add(milestone.Date);
                ends.Add(milestone.Date);
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            return new ProjectTimelineDto
            {
                PublicId = project.PublicId,
                Name = project.Name,
                RangeStart = starts.Count > 0 ? starts.Min() : today,
                RangeEnd = ends.Count > 0 ? ends.Max() : today,
                Items = dated.Select(MapToTimelineItem).OrderBy(i => i.StartDate).ToList(),
                UndatedItems = undated.Select(MapToTimelineItem).ToList(),
                Milestones = project.Milestones
                    .OrderBy(m => m.Date)
                    .Select(MapToMilestone)
                    .ToList(),
            };
        }

        public async Task<ProjectDetailDto> CreateAsync(int userId, CreateProjectDto dto)
        {
            var project = new Project
            {
                Name = dto.Name.Trim(),
                Description = dto.Description,
                ColorHex = dto.ColorHex,
                Status = dto.Status,
                StartDate = dto.StartDate,
                TargetEndDate = dto.TargetEndDate,
                OwnerUserId = userId,
            };

            await _uow.Projects.AddAsync(project);

            // The creator's membership row is not optional and not deferred: a
            // project with no members is invisible to everyone, its owner included.
            project.Members.Add(new ProjectMember
            {
                WorkUserId = userId,
                Role = ProjectRole.Admin,
            });

            await _uow.SaveChangesAsync();

            return await GetAsync(userId, project.PublicId);
        }

        public async Task<ProjectDetailDto> UpdateAsync(int userId, Guid publicId, UpdateProjectDto dto)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);
            await EnsureRoleAsync(userId, project.Id, ProjectRole.Admin);

            project.Name = dto.Name.Trim();
            project.Description = dto.Description;
            project.ColorHex = dto.ColorHex;
            project.Status = dto.Status;
            project.StartDate = dto.StartDate;
            project.TargetEndDate = dto.TargetEndDate;
            project.ActualEndDate = dto.ActualEndDate;
            project.DisplayOrder = dto.DisplayOrder;
            project.UpdatedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();

            return await GetAsync(userId, project.PublicId);
        }

        public async Task DeleteAsync(int userId, Guid publicId)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);

            // Deletion is the owner's alone — an Admin member cannot destroy
            // someone else's project along with everyone's work in it.
            if (project.OwnerUserId != userId)
                throw new UnauthorizedAccessException("Only the project owner can delete it.");

            _uow.Projects.Remove(project);
            await _uow.SaveChangesAsync();
        }

        public async Task<IEnumerable<ProjectMemberDto>> GetMembersAsync(int userId, Guid publicId)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);
            var members = await _uow.Projects.GetMembersAsync(project.Id);

            return members.Select(m => MapToMember(m, project.OwnerUserId)).ToList();
        }

        public async Task<ProjectMemberDto> AddMemberAsync(
            int userId, Guid publicId, AddProjectMemberDto dto)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);
            await EnsureRoleAsync(userId, project.Id, ProjectRole.Admin);

            var user = await _uow.WorkUsers.GetByPublicIdAsync(dto.UserPublicId)
                ?? throw new KeyNotFoundException("User not found");

            var existing = await _uow.Projects.GetMemberAsync(project.Id, user.Id);
            if (existing is not null)
                throw new InvalidOperationException("That person is already a member.");

            var member = new ProjectMember
            {
                ProjectId = project.Id,
                WorkUserId = user.Id,
                Role = dto.Role,
            };

            await _uow.Projects.AddMemberAsync(member);
            await _uow.SaveChangesAsync();

            member.User = user;
            return MapToMember(member, project.OwnerUserId);
        }

        public async Task<ProjectMemberDto> UpdateMemberRoleAsync(
            int userId, Guid publicId, Guid memberPublicId, UpdateMemberRoleDto dto)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);
            await EnsureRoleAsync(userId, project.Id, ProjectRole.Admin);

            var member = await GetMemberOrThrowAsync(project, memberPublicId);

            // Demoting the owner would let an Admin lock them out of their own
            // project; the owner's Admin row is fixed.
            if (member.WorkUserId == project.OwnerUserId && dto.Role != ProjectRole.Admin)
                throw new InvalidOperationException("The project owner must remain an Admin.");

            member.Role = dto.Role;
            member.UpdatedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();

            return MapToMember(member, project.OwnerUserId);
        }

        public async Task RemoveMemberAsync(int userId, Guid publicId, Guid memberPublicId)
        {
            var project = await GetVisibleOrThrowAsync(userId, publicId);
            await EnsureRoleAsync(userId, project.Id, ProjectRole.Admin);

            var member = await GetMemberOrThrowAsync(project, memberPublicId);

            if (member.WorkUserId == project.OwnerUserId)
                throw new InvalidOperationException("The project owner cannot be removed.");

            _uow.Projects.RemoveMember(member);
            await _uow.SaveChangesAsync();
        }

        // --- authorisation ---

        private async Task<Project> GetVisibleOrThrowAsync(int userId, Guid publicId) =>
            await _uow.Projects.GetByPublicIdAsync(userId, publicId)
                ?? throw new KeyNotFoundException("Project not found");

        private async Task EnsureRoleAsync(int userId, int projectId, ProjectRole minimum)
        {
            var role = await _uow.Projects.GetRoleAsync(userId, projectId);

            if (role is null || role < minimum)
                throw new UnauthorizedAccessException(
                    $"This action requires the {minimum} role on the project.");
        }

        // --- private helpers ---

        private async Task<ProjectMember> GetMemberOrThrowAsync(Project project, Guid memberPublicId)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(memberPublicId)
                ?? throw new KeyNotFoundException("User not found");

            return await _uow.Projects.GetMemberAsync(project.Id, user.Id)
                ?? throw new KeyNotFoundException("That person is not a member of this project.");
        }

        private static ProjectRole RoleOf(Project project, int userId) =>
            project.Members.FirstOrDefault(m => m.WorkUserId == userId)?.Role ?? ProjectRole.Viewer;

        // --- mapping ---

        private static ProjectListItemDto MapToListItem(Project project, ProjectRole myRole) => new()
        {
            PublicId = project.PublicId,
            Name = project.Name,
            Description = project.Description,
            ColorHex = project.ColorHex,
            Status = project.Status.ToString(),
            StartDate = project.StartDate,
            TargetEndDate = project.TargetEndDate,
            TotalItems = project.WorkItems.Count(w => w.Status != WorkItemStatus.Cancelled),
            CompletedItems = project.WorkItems.Count(w => w.Status == WorkItemStatus.Done),
            MyRole = myRole.ToString(),
        };

        private static ProjectDetailDto MapToDetail(Project project, ProjectRole myRole) => new()
        {
            PublicId = project.PublicId,
            Name = project.Name,
            Description = project.Description,
            ColorHex = project.ColorHex,
            Status = project.Status.ToString(),
            StartDate = project.StartDate,
            TargetEndDate = project.TargetEndDate,
            TotalItems = project.WorkItems.Count(w => w.Status != WorkItemStatus.Cancelled),
            CompletedItems = project.WorkItems.Count(w => w.Status == WorkItemStatus.Done),
            MyRole = myRole.ToString(),

            ActualEndDate = project.ActualEndDate,
            OwnerPublicId = project.Owner?.PublicId ?? Guid.Empty,
            OwnerDisplayName = project.Owner?.Username ?? string.Empty,
            Members = project.Members
                .Select(m => MapToMember(m, project.OwnerUserId))
                .OrderByDescending(m => m.IsOwner)
                .ThenBy(m => m.DisplayName)
                .ToList(),
            Milestones = project.Milestones
                .OrderBy(m => m.Date)
                .Select(MapToMilestone)
                .ToList(),
        };

        private static ProjectMemberDto MapToMember(ProjectMember member, int ownerUserId) => new()
        {
            UserPublicId = member.User?.PublicId ?? Guid.Empty,
            DisplayName = member.User?.Username ?? string.Empty,
            Role = member.Role.ToString(),
            IsOwner = member.WorkUserId == ownerUserId,
        };

        private static MilestoneDto MapToMilestone(Milestone milestone) => new()
        {
            PublicId = milestone.PublicId,
            Name = milestone.Name,
            Date = milestone.Date,
        };

        private static TimelineItemDto MapToTimelineItem(WorkItem item) => new()
        {
            PublicId = item.PublicId,
            Title = item.Title,
            // A one-dated item gets a single-day bar rather than an open-ended one.
            StartDate = item.StartDate ?? item.DueDate,
            EndDate = item.DueDate ?? item.StartDate,
            Status = item.Status.ToString(),
            ColorHex = item.Project?.ColorHex,
            AssigneePublicId = item.Assignee?.PublicId,
            AssigneeDisplayName = item.Assignee?.Username,
            ProgressPercent = item.Status == WorkItemStatus.Done ? 100 : 0,
        };
    }
}
