using FluentAssertions;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Work;
using Ralphy.Application.Validators.Work;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// A time log created offline on Monday and synced on Wednesday must keep
/// Monday's date. If any server path stamps its own clock instead, every offline
/// entry lands on its sync date, the accomplishment report credits the wrong
/// days, and the only symptom is a DTR that quietly disagrees with what actually
/// happened.
///
/// The create path already behaved correctly before offline sync existed. These
/// tests are here so it keeps doing so — nothing was pinning it, which is how it
/// ended up on the spec's list of suspects in the first place.
/// </summary>
public class OfflineSyncTimestampTests
{
    private static TimeLogService Logs(TestDb db) => new(new UnitOfWork(db.Context));
    private static WorkItemService Items(TestDb db) => new(new UnitOfWork(db.Context));

    private static Guid WorkerPublicId(TestDb db) =>
        db.Context.WorkUsers.Single(u => u.Id == TestDb.WorkerId).PublicId;

    // ── the client's clock wins ──────────────────────────────────────

    [Fact]
    public async Task A_backdated_log_keeps_its_own_date()
    {
        using var db = new TestDb();
        var loggedAt = DateTime.UtcNow.AddDays(-3);

        await Logs(db).CreateAsync(WorkerPublicId(db), new CreateTimeLogDto
        {
            TaskDescription = "Monday's work, synced Wednesday",
            Duration = 4m,
            LoggedAt = loggedAt,
        });

        db.Context.TimeLogs.Single().LoggedAt
            .Should().BeCloseTo(loggedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task An_edited_log_keeps_the_date_the_client_sent()
    {
        using var db = new TestDb();
        var user = WorkerPublicId(db);
        var log = db.AddTimeLog();
        var corrected = DateTime.UtcNow.AddDays(-2);
        db.SimulateNewRequest();

        await Logs(db).UpdateAsync(user, log.Id, new UpdateTimeLogDto
        {
            TaskDescription = "Corrected",
            Duration = 1m,
            LoggedAt = corrected,
        });

        db.Context.TimeLogs.Single().LoggedAt
            .Should().BeCloseTo(corrected, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task A_timestamp_without_a_zone_is_treated_as_UTC_not_rejected()
    {
        using var db = new TestDb();
        var naive = new DateTime(2026, 9, 1, 9, 0, 0, DateTimeKind.Unspecified);

        var created = await Logs(db).CreateAsync(WorkerPublicId(db), new CreateTimeLogDto
        {
            TaskDescription = "No Z on the wire",
            Duration = 1m,
            LoggedAt = naive,
        });

        // PostgreSQL timestamptz refuses DateTimeKind.Unspecified outright, so
        // without normalisation this is a 500 rather than a stored row.
        created.LoggedAt.Kind.Should().Be(DateTimeKind.Utc);
        created.LoggedAt.Should().Be(DateTime.SpecifyKind(naive, DateTimeKind.Utc));
    }

    [Fact]
    public async Task A_local_timestamp_is_converted_rather_than_relabelled()
    {
        using var db = new TestDb();

        // A Manila-time value, eight hours ahead of UTC. Relabelling it as UTC
        // instead of converting shifts the log by those eight hours — enough to
        // move it to the previous day in the report.
        var manila = new DateTimeOffset(DateTime.UtcNow.AddHours(-5))
            .ToOffset(TimeSpan.FromHours(8));

        var created = await Logs(db).CreateAsync(WorkerPublicId(db), new CreateTimeLogDto
        {
            TaskDescription = "Manila time",
            Duration = 1m,
            LoggedAt = manila.UtcDateTime,
        });

        created.LoggedAt.Should().BeCloseTo(manila.UtcDateTime, TimeSpan.FromSeconds(1));
    }

    // ── completion time ──────────────────────────────────────────────

    [Fact]
    public async Task A_task_completed_offline_reports_the_offline_time()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        var finishedAt = DateTime.UtcNow.AddDays(-2);
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(
            TestDb.WorkerId, item.PublicId, WorkItemStatus.Done, finishedAt);

        db.Context.WorkItems.Single().CompletedAt
            .Should().BeCloseTo(finishedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task A_drag_completed_offline_reports_the_offline_time_too()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        var finishedAt = DateTime.UtcNow.AddDays(-1);
        db.SimulateNewRequest();

        await Items(db).MoveAsync(TestDb.WorkerId, item.PublicId, new MoveWorkItemDto
        {
            Status = WorkItemStatus.Done,
            NewIndex = 0,
            CompletedAt = finishedAt,
        });

        // The two status routes agreed before offline sync existed. They have to
        // keep agreeing now that one more thing can differ between them.
        db.Context.WorkItems.Single().CompletedAt
            .Should().BeCloseTo(finishedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Omitting_the_completion_time_still_uses_the_server_clock()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.SimulateNewRequest();

        await Items(db).SetStatusAsync(TestDb.WorkerId, item.PublicId, WorkItemStatus.Done);

        // Online callers send nothing and must be completely unaffected.
        db.Context.WorkItems.Single().CompletedAt
            .Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    // ── the clock guard ──────────────────────────────────────────────

    [Theory]
    [InlineData(-1)]
    [InlineData(-89)]
    [InlineData(0)]
    public void A_plausible_date_is_accepted(int daysAgo)
    {
        var result = new CreateTimeLogDtoValidator().Validate(new CreateTimeLogDto
        {
            TaskDescription = "Real work",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddDays(daysAgo),
        });

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void A_date_in_the_future_is_refused()
    {
        var result = new CreateTimeLogDtoValidator().Validate(new CreateTimeLogDto
        {
            TaskDescription = "Tomorrow's work",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddDays(1),
        });

        // A device with a badly wrong clock should not be able to write nonsense
        // dates into the report.
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void A_date_beyond_the_backdating_window_is_refused()
    {
        var result = new CreateTimeLogDtoValidator().Validate(new CreateTimeLogDto
        {
            TaskDescription = "Ancient history",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddDays(-120),
        });

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void A_clock_a_few_minutes_fast_is_tolerated()
    {
        var result = new CreateTimeLogDtoValidator().Validate(new CreateTimeLogDto
        {
            TaskDescription = "Just finished",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddMinutes(2),
        });

        // Without slack, a phone a minute ahead of the server cannot log the work
        // it has just done — the single most common real request there is.
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void An_old_log_can_still_be_corrected()
    {
        var result = new UpdateTimeLogDtoValidator().Validate(new UpdateTimeLogDto
        {
            TaskDescription = "Fixing a typo in last quarter's entry",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddDays(-200),
        });

        // The backdating window belongs on create, where a wrong clock could
        // invent an entry at a nonsense date. An update targets a record the user
        // deliberately opened, and the client resends loggedAt on every edit — so
        // applying the window here makes an old log permanently uneditable.
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void An_edit_still_cannot_move_a_log_into_the_future()
    {
        var result = new UpdateTimeLogDtoValidator().Validate(new UpdateTimeLogDto
        {
            TaskDescription = "Tomorrow",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow.AddDays(1),
        });

        // Forward drift is still caught on both paths.
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void An_empty_guid_is_refused_as_an_idempotency_key()
    {
        var result = new CreateTimeLogDtoValidator().Validate(new CreateTimeLogDto
        {
            PublicId = Guid.Empty,
            TaskDescription = "Uninitialised client field",
            Duration = 1m,
            LoggedAt = DateTime.UtcNow,
        });

        // Guid.Empty is what an uninitialised field serialises to. Accepted as a
        // real key, the second such request from anyone collides with the first.
        result.IsValid.Should().BeFalse();
    }
}
