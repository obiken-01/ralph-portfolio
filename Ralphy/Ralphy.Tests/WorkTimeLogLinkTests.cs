using FluentAssertions;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Work;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Booking hours against a task, and the accomplishment shape that reads them back.
/// </summary>
public class WorkTimeLogLinkTests
{
    private static TimeLogService Logs(TestDb db) => new(new UnitOfWork(db.Context));
    private static AccomplishmentService Accomplishments(TestDb db) => new(new UnitOfWork(db.Context));

    private static Guid PublicIdOf(TestDb db, int workUserId) =>
        db.Context.WorkUsers.First(u => u.Id == workUserId).PublicId;

    private static CreateTimeLogDto NewLog(Guid? workItemId = null, decimal hours = 2m,
        string description = "Did the thing", int day = 5) => new()
    {
        TaskDescription = description,
        Duration = hours,
        LoggedAt = new DateTime(2026, 1, day, 9, 0, 0, DateTimeKind.Utc),
        WorkItemId = workItemId,
    };

    // ── linking ──────────────────────────────────────────────────────

    [Fact]
    public async Task A_log_can_be_booked_against_your_own_task()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "Build the thing");
        db.SimulateNewRequest();

        var created = await Logs(db).CreateAsync(PublicIdOf(db, TestDb.WorkerId), NewLog(item.PublicId));

        created.WorkItemId.Should().Be(item.PublicId);
        created.WorkItemTitle.Should().Be("Build the thing");
    }

    [Fact]
    public async Task Hours_cannot_be_booked_against_a_task_you_cannot_see()
    {
        using var db = new TestDb();
        var theirs = db.AddWorkItem(createdByUserId: TestDb.OtherWorkerId);
        db.SimulateNewRequest();

        var act = () => Logs(db).CreateAsync(PublicIdOf(db, TestDb.WorkerId), NewLog(theirs.PublicId));

        // Otherwise a guessed GUID attaches your time to a stranger's task.
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task A_log_with_no_task_is_still_valid()
    {
        using var db = new TestDb();

        var created = await Logs(db).CreateAsync(PublicIdOf(db, TestDb.WorkerId), NewLog());

        // Every pre-Work-module row looks like this and must keep working.
        created.WorkItemId.Should().BeNull();
    }

    [Fact]
    public async Task The_list_can_be_narrowed_to_one_task()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId);
        db.AddTimeLog(workUserId: TestDb.WorkerId, workItemId: item.Id, description: "Linked");
        db.AddTimeLog(workUserId: TestDb.WorkerId, description: "Unlinked");
        db.SimulateNewRequest();

        var page = await Logs(db).GetFilteredAsync(
            PublicIdOf(db, TestDb.WorkerId), new TimeLogQueryDto { WorkItemId = item.PublicId });

        page.TotalCount.Should().Be(1);
        page.Items.Should().ContainSingle().Which.TaskDescription.Should().Be("Linked");
    }

    // ── accomplishments ──────────────────────────────────────────────

    [Fact]
    public async Task Several_logs_against_one_task_on_one_day_collapse_into_one_entry()
    {
        using var db = new TestDb();
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, title: "Portal rollout");
        var owner = PublicIdOf(db, TestDb.WorkerId);
        await Logs(db).CreateAsync(owner, NewLog(item.PublicId, 2m, "Drafted the schema"));
        await Logs(db).CreateAsync(owner, NewLog(item.PublicId, 3m, "Reviewed with the team"));
        db.SimulateNewRequest();

        var range = await Accomplishments(db).GetAsync(
            TestDb.WorkerId, new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31));

        var day = range.Days.Should().ContainSingle().Subject;
        var entry = day.Entries.Should().ContainSingle().Subject;

        entry.Title.Should().Be("Portal rollout");
        entry.Hours.Should().Be(5m);
        entry.Descriptions.Should().BeEquivalentTo("Drafted the schema", "Reviewed with the team");
        range.TotalHours.Should().Be(5m);
    }

    [Fact]
    public async Task Unlinked_logs_stay_separate_and_keep_their_own_description()
    {
        using var db = new TestDb();
        var owner = PublicIdOf(db, TestDb.WorkerId);
        await Logs(db).CreateAsync(owner, NewLog(hours: 1m, description: "Answered email"));
        await Logs(db).CreateAsync(owner, NewLog(hours: 2m, description: "Filed the report"));
        db.SimulateNewRequest();

        var range = await Accomplishments(db).GetAsync(
            TestDb.WorkerId, new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31));

        var day = range.Days.Should().ContainSingle().Subject;

        // No task to collapse onto — and the CSV path listed them separately too.
        day.Entries.Should().HaveCount(2);
        day.Entries.Select(e => e.Title).Should().BeEquivalentTo("Answered email", "Filed the report");
        day.Entries.First().Hours.Should().Be(2m, "entries sort by hours descending");
    }

    [Fact]
    public async Task Accomplishments_never_widen_to_another_persons_hours()
    {
        using var db = new TestDb();
        var project = db.AddProject(ownerId: TestDb.WorkerId, extraMemberIds: TestDb.OtherWorkerId);
        var item = db.AddWorkItem(createdByUserId: TestDb.WorkerId, projectId: project.Id);
        db.AddTimeLog(workUserId: TestDb.WorkerId, workItemId: item.Id, duration: 1m);
        db.AddTimeLog(workUserId: TestDb.OtherWorkerId, workItemId: item.Id, duration: 8m);
        db.SimulateNewRequest();

        var range = await Accomplishments(db).GetAsync(
            TestDb.WorkerId, new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31));

        range.TotalHours.Should().Be(1m, "sharing a project must not pool everyone's hours");
    }

    [Fact]
    public async Task Weekend_work_is_flagged_rather_than_dropped()
    {
        using var db = new TestDb();
        // 2026-01-03 is a Saturday.
        await Logs(db).CreateAsync(PublicIdOf(db, TestDb.WorkerId), NewLog(day: 3));
        db.SimulateNewRequest();

        var range = await Accomplishments(db).GetAsync(
            TestDb.WorkerId, new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31));

        var day = range.Days.Should().ContainSingle().Subject;
        day.IsWeekend.Should().BeTrue();
        day.DayOfWeek.Should().Be("Saturday");
    }

    [Fact]
    public async Task An_inverted_range_is_rejected()
    {
        using var db = new TestDb();

        var act = () => Accomplishments(db).GetAsync(
            TestDb.WorkerId, new DateOnly(2026, 1, 31), new DateOnly(2026, 1, 1));

        await act.Should().ThrowAsync<ArgumentException>();
    }
}
