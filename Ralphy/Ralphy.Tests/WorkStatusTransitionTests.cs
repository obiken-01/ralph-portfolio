using FluentAssertions;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Status can change by two routes — the detail modal's dropdown and a Kanban
/// drag — and they must agree.
///
/// If only the dropdown stamps CompletedAt, a card dragged into Done looks
/// finished on the board but reports as never completed. Nothing on screen shows
/// the difference; it surfaces months later as a hole in "completed in period"
/// reporting, which is the worst time to find it. So both paths run through the
/// same transition, and both are asserted here.
/// </summary>
public class WorkStatusTransitionTests
{
    private static WorkItemService Items(TestDb db) => new(new UnitOfWork(db.Context));

    private static MoveWorkItemDto Move(WorkItemStatus status, int index = 0) =>
        new() { Status = status, NewIndex = index };

    // ── the dropdown ─────────────────────────────────────────────────

    [Fact]
    public async Task Setting_status_to_Done_stamps_CompletedAt()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Done);

        db.Context.WorkItems.Single().CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Setting_status_away_from_Done_clears_CompletedAt()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, status: WorkItemStatus.Done);
        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Done);
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.InProgress);

        // A reopened task that keeps its completion timestamp corrupts any
        // "completed in period" report later.
        db.Context.WorkItems.Single().CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task The_status_actually_persists()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, status: WorkItemStatus.Todo);
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Blocked);
        db.SimulateNewRequest();

        // Re-read rather than trusting the tracked entity: a service that mutates
        // in memory and maps the response off that object returns 200 with the new
        // value while the database keeps the old one.
        var reread = await Items(db).GetAsync(TestDb.WorkerId, item.PublicId);
        reread.Status.Should().Be(nameof(WorkItemStatus.Blocked));
    }

    // ── the drag ─────────────────────────────────────────────────────

    [Fact]
    public async Task Dragging_into_Done_stamps_CompletedAt_too()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, Move(WorkItemStatus.Done));

        db.Context.WorkItems.Single().CompletedAt.Should().NotBeNull(
            "a drag into Done must complete the task exactly as the dropdown does");
    }

    [Fact]
    public async Task Dragging_out_of_Done_clears_CompletedAt_too()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, Move(WorkItemStatus.Done));
        db.SimulateNewRequest();

        await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, Move(WorkItemStatus.Todo));

        db.Context.WorkItems.Single().CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task Both_routes_leave_the_item_in_the_same_shape()
    {
        using var db = new TestDb();
        var dragged = db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "dragged");
        var picked = db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "picked");
        db.SimulateNewRequest();

        await Items(db).MoveAsync(TestDb.WorkerId, dragged.PublicId, Move(WorkItemStatus.Done));
        await Items(db).SetStatusAsync(TestDb.WorkerId, picked.PublicId, WorkItemStatus.Done);
        db.SimulateNewRequest();

        var a = db.Context.WorkItems.Single(w => w.Title == "dragged");
        var b = db.Context.WorkItems.Single(w => w.Title == "picked");

        a.Status.Should().Be(b.Status);
        a.CompletedAt.HasValue.Should().Be(b.CompletedAt.HasValue);
    }

    // ── ordering ─────────────────────────────────────────────────────

    [Fact]
    public async Task A_dragged_card_lands_at_the_requested_index()
    {
        using var db = new TestDb();
        foreach (var i in new[] { 0, 1, 2 })
            db.AddWorkItem(createdByUserId: TestDb.WorkerId, boardOrder: i, title: $"todo-{i}");

        var moved = db.Context.WorkItems.Single(w => w.Title == "todo-2");
        db.SimulateNewRequest();

        await Items(db).MoveAsync(TestDb.WorkerId, moved.PublicId, Move(WorkItemStatus.Todo, index: 0));
        db.SimulateNewRequest();

        var board = await Items(db).GetBoardAsync(TestDb.WorkerId, null, null);
        var todo = board.Columns.Single(c => c.Status == nameof(WorkItemStatus.Todo));

        todo.Items.Select(i => i.Title).Should().Equal("todo-2", "todo-0", "todo-1");
    }

    [Fact]
    public async Task Re_applying_the_same_status_does_not_restamp_CompletedAt()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Done);
        var first = db.Context.WorkItems.Single().CompletedAt;
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Done);

        // Otherwise every idle re-save walks the completion date forward.
        db.Context.WorkItems.Single().CompletedAt.Should().Be(first);
    }
}
