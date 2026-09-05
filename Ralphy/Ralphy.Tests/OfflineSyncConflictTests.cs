using FluentAssertions;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Exceptions;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// An offline edit is made against a snapshot that may be stale by the time it
/// syncs. The client sends the UpdatedAt it last saw; the server refuses if the
/// record has moved on since.
///
/// With a single account this is close to a no-op — you cannot realistically
/// conflict with yourself. It is here because retrofitting conflict detection
/// once there is real data in the system is far worse than adding it now, and
/// because a second account silently overwriting the first is not a failure
/// anyone would notice happening.
/// </summary>
public class OfflineSyncConflictTests
{
    private static TimeLogService Logs(TestDb db) => new(new UnitOfWork(db.Context));
    private static WorkItemService Items(TestDb db) => new(new UnitOfWork(db.Context));

    private static Guid WorkerPublicId(TestDb db) =>
        db.Context.WorkUsers.Single(u => u.Id == TestDb.WorkerId).PublicId;

    private static UpdateTimeLogDto LogEdit(DateTime? expected, string description = "Edited") =>
        new()
        {
            ExpectedUpdatedAt = expected,
            TaskDescription = description,
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddHours(-1),
        };

    // ── time logs ────────────────────────────────────────────────────

    [Fact]
    public async Task An_edit_against_a_stale_snapshot_is_refused()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog();

        // Somebody else already moved the record on. The offline client still
        // holds the snapshot from before that.
        log.UpdatedAt = DateTime.UtcNow;
        db.Context.SaveChanges();
        db.SimulateNewRequest();

        var act = async () => await Logs(db).UpdateAsync(
            user, log.Id, LogEdit(DateTime.UtcNow.AddHours(-2)));

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task The_refusal_carries_the_current_server_state()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog(description: "what the server actually holds");

        log.UpdatedAt = DateTime.UtcNow;
        db.Context.SaveChanges();
        db.SimulateNewRequest();

        var thrown = await Logs(db).Invoking(s => s.UpdateAsync(
                user, log.Id, LogEdit(DateTime.UtcNow.AddHours(-2))))
            .Should().ThrowAsync<ConflictException>();

        // A client that only gets "conflict" can do nothing but drop the edit or
        // retry it forever. With the current state it can show a comparison.
        thrown.Which.Current.Should().BeOfType<TimeLogDto>()
            .Which.TaskDescription.Should().Be("what the server actually holds");
    }

    [Fact]
    public async Task An_edit_against_a_current_snapshot_goes_through()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog();
        db.SimulateNewRequest();

        var result = await Logs(db).UpdateAsync(
            user, log.Id, LogEdit(log.CreatedAt, "accepted"));

        result.TaskDescription.Should().Be("accepted");
    }

    [Fact]
    public async Task A_never_edited_record_still_detects_a_conflict()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog();
        db.SimulateNewRequest();

        // UpdatedAt is null until a record is first edited. Comparing against
        // that null evaluates false and waves the conflict through — which would
        // mean the check never fires on the majority of records, the ones nobody
        // has touched yet. CreatedAt stands in.
        var act = async () => await Logs(db).UpdateAsync(
            user, log.Id, LogEdit(log.CreatedAt.AddHours(-2)));

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Omitting_the_snapshot_keeps_last_write_wins()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog();

        log.UpdatedAt = DateTime.UtcNow;
        db.Context.SaveChanges();
        db.SimulateNewRequest();

        // Online clients send no snapshot and must behave exactly as before.
        var result = await Logs(db).UpdateAsync(user, log.Id, LogEdit(null, "overwritten"));

        result.TaskDescription.Should().Be("overwritten");
    }

    [Fact]
    public async Task Sub_second_drift_is_not_a_conflict()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog();
        var updatedAt = DateTime.UtcNow;

        log.UpdatedAt = updatedAt;
        db.Context.SaveChanges();
        db.SimulateNewRequest();

        // PostgreSQL timestamptz and .NET DateTime do not round-trip at the same
        // precision. An exact comparison invents conflicts that are not there.
        var result = await Logs(db).UpdateAsync(
            user, log.Id, LogEdit(updatedAt.AddMilliseconds(-300), "accepted"));

        result.TaskDescription.Should().Be("accepted");
    }

    // ── work items ───────────────────────────────────────────────────

    [Fact]
    public async Task A_stale_task_edit_is_refused_with_the_current_state()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "server version");

        item.UpdatedAt = DateTime.UtcNow;
        db.Context.SaveChanges();
        db.SimulateNewRequest();

        var thrown = await Items(db).Invoking(s => s.UpdateAsync(
                TestDb.WorkerId, item.PublicId, new UpdateWorkItemDto
                {
                    Title = "my offline version",
                    ExpectedUpdatedAt = DateTime.UtcNow.AddHours(-2),
                }))
            .Should().ThrowAsync<ConflictException>();

        thrown.Which.Current.Should().BeOfType<WorkItemDetailDto>()
            .Which.Title.Should().Be("server version");

        db.Context.WorkItems.Single().Title.Should().Be("server version",
            "a refused write must not have partially applied");
    }

    [Fact]
    public async Task A_current_task_edit_goes_through()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        var result = await Items(db).UpdateAsync(
            TestDb.WorkerId, item.PublicId, new UpdateWorkItemDto
            {
                Title = "accepted",
                ExpectedUpdatedAt = item.CreatedAt,
            });

        result.Title.Should().Be("accepted");
    }

    // ── deleted records ──────────────────────────────────────────────

    [Fact]
    public async Task Editing_a_task_deleted_server_side_is_a_clean_not_found()
    {
        using var db = new TestDb();

        // The outbox entry targets something that no longer exists. It has to
        // fail in a way the client can act on — a 404 it discards — rather than
        // a 500 it retries forever.
        var act = async () => await Items(db).UpdateAsync(
            TestDb.WorkerId, Guid.NewGuid(), new UpdateWorkItemDto { Title = "gone" });

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Deleting_a_task_already_deleted_is_a_clean_not_found()
    {
        using var db = new TestDb();

        var act = async () => await Items(db).DeleteAsync(TestDb.WorkerId, Guid.NewGuid());

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Editing_a_log_deleted_server_side_is_a_clean_not_found()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);

        var act = async () => await Logs(db).UpdateAsync(user, 9999, LogEdit(null));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task A_stale_edit_of_a_deleted_record_is_not_found_rather_than_conflict()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);

        // Order matters: the client should be told the target is gone so it drops
        // the entry, not that it is stale, which invites a refetch-and-retry loop
        // against something that will never come back.
        var act = async () => await Logs(db).UpdateAsync(
            user, 9999, LogEdit(DateTime.UtcNow.AddDays(-1)));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
