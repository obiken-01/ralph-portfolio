using FluentAssertions;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Models.Work;
using Ralphy.Infrastructure.Data.Repositories.Work;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The leak regression suite for WorkItemRepository.VisibleTo.
///
/// One predicate decides who can see which task, and every read and write in the
/// repository composes onto it. If it ever stops holding, one person quietly reads
/// or reorders another's work and nothing on screen says so — so each accessor is
/// asked the same two questions: does the person entitled to it get through, and is
/// everyone else refused.
///
/// The rules: a task is visible if it has no project and you created it, or it
/// belongs to a project you are a member of.
/// </summary>
public class WorkItemVisibilityTests
{
    private static WorkItemRepository Repo(TestDb db) => new(db.Context);

    // ── standalone items are private to their creator ────────────────

    [Fact]
    public async Task A_standalone_item_is_visible_to_its_creator()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var found = await Repo(db).GetByPublicIdAsync(TestDb.WorkerId, item.PublicId);

        found.Should().NotBeNull();
    }

    [Fact]
    public async Task A_standalone_item_is_invisible_to_everyone_else()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var found = await Repo(db).GetByPublicIdAsync(TestDb.OtherWorkerId, item.PublicId);

        found.Should().BeNull("a guessed GUID must not read someone else's task");
    }

    [Fact]
    public async Task The_write_path_refuses_a_stranger_too()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var found = await Repo(db).GetForWriteAsync(TestDb.OtherWorkerId, item.PublicId);

        found.Should().BeNull();
    }

    // ── project items follow membership ──────────────────────────────

    [Fact]
    public async Task A_project_item_is_visible_to_every_member()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        var found = await Repo(db).GetByPublicIdAsync(TestDb.OtherWorkerId, item.PublicId);

        found.Should().NotBeNull("membership, not authorship, grants sight of a project task");
    }

    [Fact]
    public async Task A_project_item_is_invisible_to_a_non_member()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.SimulateNewRequest();

        var found = await Repo(db).GetByPublicIdAsync(TestDb.OtherWorkerId, item.PublicId);

        found.Should().BeNull();
    }

    // ── list and board reads are scoped, not just single fetches ─────

    [Fact]
    public async Task Query_counts_and_returns_only_visible_items()
    {
        using var db = new TestDb();
        db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "Mine");
        db.AddWorkItem(createdByUserId: TestDb.OtherWorkerId, title: "Theirs");
        db.SimulateNewRequest();

        var (items, total) = await Repo(db).QueryAsync(TestDb.WorkerId, new WorkItemQuery());

        total.Should().Be(1, "the total drives paging and must not count what it cannot show");
        items.Should().ContainSingle().Which.Title.Should().Be("Mine");
    }

    [Fact]
    public async Task The_board_excludes_other_peoples_standalone_items()
    {
        using var db = new TestDb();
        db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "Mine");
        db.AddWorkItem(createdByUserId: TestDb.OtherWorkerId, title: "Theirs");
        db.SimulateNewRequest();

        var board = await Repo(db).GetBoardAsync(TestDb.WorkerId, null, null);

        board.Should().ContainSingle().Which.Title.Should().Be("Mine");
    }

    [Fact]
    public async Task Cancelled_items_stay_off_the_board()
    {
        using var db = new TestDb();
        db.AddWorkItem(createdByUserId: TestDb.WorkerId, status: WorkItemStatus.Cancelled);
        db.SimulateNewRequest();

        var board = await Repo(db).GetBoardAsync(TestDb.WorkerId, null, null);

        board.Should().BeEmpty();
    }

    // ── seeing a task is not seeing everyone's hours ─────────────────

    [Fact]
    public async Task A_shared_task_exposes_only_the_callers_own_time_logs()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.AddTimeLog(workUserId: TestDb.WorkerId, workItemId: item.Id, description: "Mine");
        db.AddTimeLog(workUserId: TestDb.OtherWorkerId, workItemId: item.Id, description: "Theirs");
        db.SimulateNewRequest();

        var found = await Repo(db).GetByPublicIdAsync(TestDb.WorkerId, item.PublicId);

        found!.TimeLogs.Should().ContainSingle()
            .Which.TaskDescription.Should().Be("Mine",
                "project membership grants sight of the task, never of other people's hours");
    }

    // ── the reorder path ─────────────────────────────────────────────

    [Fact]
    public async Task Reordering_your_column_leaves_other_peoples_standalone_items_alone()
    {
        using var db = new TestDb();
        foreach (var i in new[] { 0, 1, 2 })
        {
            db.AddWorkItem(createdByUserId: TestDb.WorkerId, boardOrder: i, title: $"mine-{i}");
            db.AddWorkItem(createdByUserId: TestDb.OtherWorkerId, boardOrder: i, title: $"theirs-{i}");
        }

        var moved = db.Context.WorkItems.First(w => w.Title == "mine-2");
        db.SimulateNewRequest();

        await Repo(db).ReorderColumnAsync(
            TestDb.WorkerId, WorkItemStatus.Todo, null, moved.PublicId, newIndex: 0);
        await db.Context.SaveChangesAsync();

        // Standalone columns are keyed on (status, projectId == null), which every
        // user shares. An unscoped renumber would rewrite these to 0..5.
        var theirs = db.Context.WorkItems
            .Where(w => w.CreatedByUserId == TestDb.OtherWorkerId)
            .OrderBy(w => w.Title)
            .Select(w => w.BoardOrder)
            .ToList();

        theirs.Should().Equal(0, 1, 2);
    }

    [Fact]
    public async Task Reordering_renumbers_the_callers_own_column()
    {
        using var db = new TestDb();
        foreach (var i in new[] { 0, 1, 2 })
            db.AddWorkItem(createdByUserId: TestDb.WorkerId, boardOrder: i, title: $"mine-{i}");

        var moved = db.Context.WorkItems.First(w => w.Title == "mine-2");
        db.SimulateNewRequest();

        await Repo(db).ReorderColumnAsync(
            TestDb.WorkerId, WorkItemStatus.Todo, null, moved.PublicId, newIndex: 0);
        await db.Context.SaveChangesAsync();

        var order = db.Context.WorkItems
            .OrderBy(w => w.BoardOrder)
            .Select(w => w.Title)
            .ToList();

        order.Should().Equal("mine-2", "mine-0", "mine-1");
    }

    [Fact]
    public async Task Reordering_an_item_you_cannot_see_is_refused()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var act = () => Repo(db).ReorderColumnAsync(
            TestDb.OtherWorkerId, WorkItemStatus.Todo, null, item.PublicId, newIndex: 0);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task The_next_board_order_ignores_other_peoples_columns()
    {
        using var db = new TestDb();
        db.AddWorkItem(createdByUserId: TestDb.OtherWorkerId, boardOrder: 9);
        db.SimulateNewRequest();

        var next = await Repo(db).GetNextBoardOrderAsync(TestDb.WorkerId, WorkItemStatus.Todo, null);

        next.Should().Be(0, "an empty column starts at 0 regardless of what others have");
    }
}
