using FluentAssertions;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// What a write that says nothing about the project does to the project.
///
/// It used to unlink it. Every client that edited a task or dragged a card
/// without echoing projectPublicId back — which is every client that treats the
/// edit form as a patch — stripped the task out of its project, and the only
/// evidence was "Project: None" on the detail screen and a project board that
/// had quietly lost its work. Silence now means "leave it where it is", and
/// unlinking has to be asked for by name.
/// </summary>
public class WorkItemProjectRetentionTests
{
    private static WorkItemService Items(TestDb db) => new(new UnitOfWork(db.Context));

    // ── editing ──────────────────────────────────────────────────────

    [Fact]
    public async Task Editing_a_task_without_naming_a_project_keeps_the_one_it_has()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, name: "PPDO Portal");
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        var result = await Items(db).UpdateAsync(TestDb.WorkerId, item.PublicId, new UpdateWorkItemDto
        {
            Title = "V1.8.0 Phase 3",
            Status = WorkItemStatus.InProgress,
        });

        result.ProjectPublicId.Should().Be(project.PublicId);
        result.ProjectName.Should().Be("PPDO Portal");
        db.Context.WorkItems.Single().ProjectId.Should().Be(project.Id);
    }

    [Fact]
    public async Task Editing_a_task_can_still_move_it_to_another_project()
    {
        using var db = new TestDb();
        var from = db.AddProject(ownerId: TestDb.WorkerId, name: "From");
        var to = db.AddProject(ownerId: TestDb.WorkerId, name: "To");
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: from.Id);
        db.SimulateNewRequest();

        var result = await Items(db).UpdateAsync(TestDb.WorkerId, item.PublicId, new UpdateWorkItemDto
        {
            Title = "A task",
            ProjectPublicId = to.PublicId,
        });

        result.ProjectPublicId.Should().Be(to.PublicId);
    }

    [Fact]
    public async Task Editing_a_standalone_task_can_attach_it_to_a_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, name: "PPDO Portal");
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var result = await Items(db).UpdateAsync(TestDb.WorkerId, item.PublicId, new UpdateWorkItemDto
        {
            Title = "A task",
            ProjectPublicId = project.PublicId,
        });

        result.ProjectPublicId.Should().Be(project.PublicId);
        db.Context.WorkItems.Single().ProjectId.Should().Be(project.Id);
    }

    [Fact]
    public async Task Detaching_has_to_be_asked_for_explicitly()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        var result = await Items(db).UpdateAsync(TestDb.WorkerId, item.PublicId, new UpdateWorkItemDto
        {
            Title = "A task",
            ClearProject = true,
        });

        result.ProjectPublicId.Should().BeNull();
        db.Context.WorkItems.Single().ProjectId.Should().BeNull();
    }

    [Fact]
    public async Task Only_the_creator_can_detach_a_task_from_its_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(
            ownerId: TestDb.WorkerId, name: "Shared", extraMemberIds: TestDb.OtherWorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        // A member may edit the task; making it standalone would hide it from
        // everyone else on the project, so that stays with its creator.
        var act = () => Items(db).UpdateAsync(TestDb.OtherWorkerId, item.PublicId, new UpdateWorkItemDto
        {
            Title = "A task",
            ClearProject = true,
        });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task A_member_who_edits_someone_elses_task_leaves_the_project_alone()
    {
        using var db = new TestDb();
        var project = db.AddProject(
            ownerId: TestDb.WorkerId, name: "Shared", extraMemberIds: TestDb.OtherWorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        var result = await Items(db).UpdateAsync(TestDb.OtherWorkerId, item.PublicId, new UpdateWorkItemDto
        {
            Title = "Edited by a teammate",
        });

        result.ProjectPublicId.Should().Be(project.PublicId);
    }

    // ── dragging on the board ────────────────────────────────────────

    [Fact]
    public async Task Dragging_a_card_keeps_it_in_its_project()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, name: "PPDO Portal");
        var item = db.AddWorkItem(
            createdByUserId: TestDb.WorkerId, projectId: project.Id, status: WorkItemStatus.Todo);
        db.SimulateNewRequest();

        var moved = await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, new MoveWorkItemDto
        {
            Status = WorkItemStatus.InProgress,
            NewIndex = 0,
        });

        moved.Status.Should().Be(nameof(WorkItemStatus.InProgress));
        moved.ProjectPublicId.Should().Be(project.PublicId);
        db.Context.WorkItems.Single().ProjectId.Should().Be(project.Id);
    }

    [Fact]
    public async Task A_drag_can_detach_the_card_when_it_says_so()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, new MoveWorkItemDto
        {
            Status = WorkItemStatus.Todo,
            NewIndex = 0,
            ClearProject = true,
        });

        db.Context.WorkItems.Single().ProjectId.Should().BeNull();
    }

    [Fact]
    public async Task A_drag_does_not_pull_a_standalone_task_into_a_project()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var moved = await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, new MoveWorkItemDto
        {
            Status = WorkItemStatus.Done,
            NewIndex = 0,
        });

        moved.ProjectPublicId.Should().BeNull();
        db.Context.WorkItems.Single().ProjectId.Should().BeNull();
    }
}
