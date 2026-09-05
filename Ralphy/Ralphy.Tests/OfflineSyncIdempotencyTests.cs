using FluentAssertions;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Exceptions;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// A device offline for two hours accumulates queued writes. On reconnect the
/// outbox replays them, and any request whose response was lost — dropped
/// connection, timeout, app backgrounded mid-flight — gets sent again.
///
/// Without an idempotency key that second send creates a duplicate. Duplicate
/// time logs quietly inflate the accomplishment report, and nobody finds out
/// until DTR cutoff, by which point the original evidence is weeks old. So the
/// replay case is asserted directly, not inferred from the happy path.
/// </summary>
public class OfflineSyncIdempotencyTests
{
    private static TimeLogService Logs(TestDb db) => new(new UnitOfWork(db.Context));
    private static WorkItemService Items(TestDb db) => new(new UnitOfWork(db.Context));

    private static Guid WorkerPublicId(TestDb db) =>
        db.Context.WorkUsers.Single(u => u.Id == TestDb.WorkerId).PublicId;

    private static CreateTimeLogDto Log(Guid? publicId = null, string description = "Queued offline") =>
        new()
        {
            PublicId = publicId,
            TaskDescription = description,
            Duration = 2m,
            LoggedAt = DateTime.UtcNow.AddHours(-3),
        };

    // ── time logs ────────────────────────────────────────────────────

    [Fact]
    public async Task A_replayed_create_returns_the_same_log_instead_of_a_second_one()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var key = Guid.NewGuid();

        var first = await Logs(db).CreateAsync(user, Log(key));
        db.SimulateNewRequest();
        var second = await Logs(db).CreateAsync(user, Log(key));

        second.Id.Should().Be(first.Id);
        db.Context.TimeLogs.Count().Should().Be(1,
            "the retry must not book the same hours twice");
    }

    [Fact]
    public async Task A_replay_does_not_overwrite_what_the_first_call_stored()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var key = Guid.NewGuid();

        await Logs(db).CreateAsync(user, Log(key, "the original"));
        db.SimulateNewRequest();

        // Same key, different content — a client that mutated its queued copy
        // between attempts. The server already has a record under this key; the
        // create is a no-op, not an update.
        var second = await Logs(db).CreateAsync(user, Log(key, "edited in the queue"));

        second.TaskDescription.Should().Be("the original");
        db.Context.TimeLogs.Single().TaskDescription.Should().Be("the original");
    }

    [Fact]
    public async Task Omitting_the_key_still_creates_every_time()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);

        await Logs(db).CreateAsync(user, Log());
        db.SimulateNewRequest();
        await Logs(db).CreateAsync(user, Log());

        // Online clients send no key and must keep the old behaviour — two
        // separate logs, not a collapse into one.
        db.Context.TimeLogs.Count().Should().Be(2);
    }

    [Fact]
    public async Task A_server_generated_key_is_still_unique_per_log()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);

        var a = await Logs(db).CreateAsync(user, Log());
        db.SimulateNewRequest();
        var b = await Logs(db).CreateAsync(user, Log());

        a.PublicId.Should().NotBe(Guid.Empty);
        b.PublicId.Should().NotBe(a.PublicId);
    }

    [Fact]
    public async Task Another_users_key_does_not_hand_over_their_log()
    {
        using var db = new TestDb();
        var key = Guid.NewGuid();

        var mine = await Logs(db).CreateAsync(WorkerPublicId(db), Log(key, "my hours"));
        db.SimulateNewRequest();

        var otherUser = db.Context.WorkUsers.Single(u => u.Id == TestDb.OtherWorkerId).PublicId;

        // Reusing someone else's key must never return their record. The unique
        // index refuses the insert instead — a failure the client can retry with
        // a fresh key, not a silent leak of another account's data.
        var act = async () => await Logs(db).CreateAsync(otherUser, Log(key, "not mine"));

        await act.Should().ThrowAsync<DuplicateKeyException>();
        db.Context.TimeLogs.Single().TaskDescription.Should().Be("my hours");
        _ = mine;
    }

    // ── work items ───────────────────────────────────────────────────

    [Fact]
    public async Task A_replayed_task_create_returns_the_same_task()
    {
        using var db = new TestDb();
        var key = Guid.NewGuid();

        var first = await Items(db).CreateAsync(
            TestDb.WorkerId, new CreateWorkItemDto { PublicId = key, Title = "Queued task" });
        db.SimulateNewRequest();

        var second = await Items(db).CreateAsync(
            TestDb.WorkerId, new CreateWorkItemDto { PublicId = key, Title = "Queued task" });

        second.PublicId.Should().Be(first.PublicId);
        db.Context.WorkItems.Count().Should().Be(1);
    }

    [Fact]
    public async Task A_client_supplied_task_key_is_the_one_stored()
    {
        using var db = new TestDb();
        var key = Guid.NewGuid();

        var created = await Items(db).CreateAsync(
            TestDb.WorkerId, new CreateWorkItemDto { PublicId = key, Title = "Mine" });

        // The client has already referenced this id in its own queued follow-up
        // operations, so the server must honour it rather than assign its own.
        created.PublicId.Should().Be(key);
    }

    [Fact]
    public async Task Another_users_task_key_does_not_hand_over_their_task()
    {
        using var db = new TestDb();
        var key = Guid.NewGuid();

        await Items(db).CreateAsync(
            TestDb.WorkerId, new CreateWorkItemDto { PublicId = key, Title = "mine" });
        db.SimulateNewRequest();

        var act = async () => await Items(db).CreateAsync(
            TestDb.OtherWorkerId, new CreateWorkItemDto { PublicId = key, Title = "not mine" });

        await act.Should().ThrowAsync<DuplicateKeyException>();
        db.Context.WorkItems.Single().Title.Should().Be("mine");
    }
}
