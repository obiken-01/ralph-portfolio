using FluentAssertions;
using Ralphy.Application.DTOs.Work.Projects;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The authorisation table from the spec, turned into assertions.
///
/// Visibility and permission are different questions: a Viewer can see a
/// project's tasks and must not be able to change them, and being a member of
/// one project says nothing about another. Each rule gets the owner case and the
/// refusal case, because a rule that only ever passes proves nothing.
/// </summary>
public class WorkAuthorizationTests
{
    private static WorkItemService Items(TestDb db) => new(new UnitOfWork(db.Context));
    private static ProjectService Projects(TestDb db) => new(new UnitOfWork(db.Context));

    private static CreateWorkItemDto NewTask(Guid? projectPublicId = null) => new()
    {
        Title = "A task",
        ProjectPublicId = projectPublicId,
    };

    // ── creating ─────────────────────────────────────────────────────

    [Fact]
    public async Task Anyone_can_create_a_standalone_task()
    {
        using var db = new TestDb();

        var created = await Items(db).CreateAsync(TestDb.WorkerId, NewTask());

        created.Title.Should().Be("A task");
        created.ProjectPublicId.Should().BeNull();
    }

    [Fact]
    public async Task Creating_in_a_project_you_are_not_in_is_refused()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var act = () => Items(db).CreateAsync(TestDb.OtherWorkerId, NewTask(project.PublicId));

        // Not a member, so the project does not resolve at all — deliberately the
        // same answer as "no such project", which leaks nothing.
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task A_viewer_cannot_create_work_in_the_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        await DemoteToViewerAsync(db, project.Id, TestDb.OtherWorkerId);
        db.SimulateNewRequest();

        var act = () => Items(db).CreateAsync(TestDb.OtherWorkerId, NewTask(project.PublicId));

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── editing ──────────────────────────────────────────────────────

    [Fact]
    public async Task A_viewer_can_see_a_task_but_not_change_it()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        await DemoteToViewerAsync(db, project.Id, TestDb.OtherWorkerId);
        db.SimulateNewRequest();

        // Reading is fine.
        var read = await Items(db).GetAsync(TestDb.OtherWorkerId, item.PublicId);
        read.Should().NotBeNull();

        var act = () => Items(db).SetStatusAsync(
            TestDb.OtherWorkerId, item.PublicId, WorkItemStatus.Done);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task A_stranger_cannot_delete_your_standalone_task()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var act = () => Items(db).DeleteAsync(TestDb.OtherWorkerId, item.PublicId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Completing_a_task_stamps_CompletedAt_and_clearing_it_unstamps()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Done);
        db.Context.WorkItems.First().CompletedAt.Should().NotBeNull();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.InProgress);
        db.Context.WorkItems.First().CompletedAt.Should().BeNull();
    }

    // ── moving across projects ───────────────────────────────────────

    [Fact]
    public async Task You_cannot_push_a_task_into_a_project_you_are_not_in()
    {
        using var db = new TestDb();
        var mine = db.AddProject(ownerId: TestDb.WorkerId, name: "Mine");
        var theirs = db.AddProject(ownerId: TestDb.OtherWorkerId, name: "Theirs");
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: mine.Id);
        db.SimulateNewRequest();

        var act = () => Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, new MoveWorkItemDto
        {
            Status = WorkItemStatus.Todo,
            NewIndex = 0,
            ProjectPublicId = theirs.PublicId,
        });

        // Seeing the source proves nothing about the destination.
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── assignment ───────────────────────────────────────────────────

    [Fact]
    public async Task A_task_cannot_be_assigned_to_someone_outside_the_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        var outsider = db.Context.WorkUsers.First(u => u.Id == TestDb.OtherWorkerId);
        db.SimulateNewRequest();

        var act = () => Items(db).SetAssigneeAsync(
            TestDb.WorkerId, item.PublicId, new UpdateAssigneeDto { AssigneePublicId = outsider.PublicId });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not a member*");
    }

    // ── projects ─────────────────────────────────────────────────────

    [Fact]
    public async Task Creating_a_project_makes_the_creator_an_admin_member()
    {
        using var db = new TestDb();

        var project = await Projects(db).CreateAsync(TestDb.WorkerId, new CreateProjectDto { Name = "New" });

        // Without this row the project would be invisible to everyone, its owner
        // included, because visibility resolves through membership.
        project.MyRole.Should().Be(nameof(ProjectRole.Admin));
        project.Members.Should().ContainSingle().Which.IsOwner.Should().BeTrue();
    }

    [Fact]
    public async Task A_new_project_is_immediately_visible_to_its_creator()
    {
        using var db = new TestDb();
        var created = await Projects(db).CreateAsync(TestDb.WorkerId, new CreateProjectDto { Name = "New" });
        db.SimulateNewRequest();

        var all = await Projects(db).GetAllAsync(TestDb.WorkerId, null, null);

        all.Should().ContainSingle().Which.PublicId.Should().Be(created.PublicId);
    }

    [Fact]
    public async Task Only_the_owner_can_delete_a_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        await PromoteToAdminAsync(db, project.Id, TestDb.OtherWorkerId);
        db.SimulateNewRequest();

        var act = () => Projects(db).DeleteAsync(TestDb.OtherWorkerId, project.PublicId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*owner*");
    }

    [Fact]
    public async Task A_plain_member_cannot_edit_the_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        db.SimulateNewRequest();

        var act = () => Projects(db).UpdateAsync(
            TestDb.OtherWorkerId, project.PublicId, new UpdateProjectDto { Name = "Renamed" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task The_owner_cannot_be_removed_from_their_own_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        var owner = db.Context.WorkUsers.First(u => u.Id == TestDb.WorkerId);
        db.SimulateNewRequest();

        var act = () => Projects(db).RemoveMemberAsync(
            TestDb.WorkerId, project.PublicId, owner.PublicId);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task The_owner_cannot_be_demoted_below_admin()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        var owner = db.Context.WorkUsers.First(u => u.Id == TestDb.WorkerId);
        db.SimulateNewRequest();

        var act = () => Projects(db).UpdateMemberRoleAsync(
            TestDb.WorkerId, project.PublicId, owner.PublicId,
            new UpdateMemberRoleDto { Role = ProjectRole.Viewer });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    // --- helpers ---

    private static async Task DemoteToViewerAsync(TestDb db, int projectId, int userId)
        => await SetRoleAsync(db, projectId, userId, ProjectRole.Viewer);

    private static async Task PromoteToAdminAsync(TestDb db, int projectId, int userId)
        => await SetRoleAsync(db, projectId, userId, ProjectRole.Admin);

    private static async Task SetRoleAsync(TestDb db, int projectId, int userId, ProjectRole role)
    {
        var member = db.Context.ProjectMembers
            .First(m => m.ProjectId == projectId && m.WorkUserId == userId);

        member.Role = role;
        await db.Context.SaveChangesAsync();
    }
}
