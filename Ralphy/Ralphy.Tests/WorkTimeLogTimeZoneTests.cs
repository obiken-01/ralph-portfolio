using System.Text;
using FluentAssertions;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Work;
using Ralphy.Infrastructure.Data;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// LoggedAt is stored UTC but filtered, exported and grouped by the user's day.
/// The case that broke: 7:30 AM on 26 Oct in Manila is 23:30 UTC on 25 Oct.
/// </summary>
public class WorkTimeLogTimeZoneTests
{
    private static readonly DateTime EarlyMorningManila = new(2026, 10, 25, 23, 30, 0, DateTimeKind.Utc);
    private static readonly DateOnly Oct25 = new(2026, 10, 25);
    private static readonly DateOnly Oct26 = new(2026, 10, 26);

    private static TimeLogService Logs(TestDb db) => new(new UnitOfWork(db.Context));
    private static AccomplishmentService Accomplishments(TestDb db) => new(new UnitOfWork(db.Context));

    private static Guid Owner(TestDb db) =>
        db.Context.WorkUsers.First(u => u.Id == TestDb.WorkerId).PublicId;

    private static async Task<TestDb> WithEarlyMorningLogAsync()
    {
        var db = new TestDb();
        await Logs(db).CreateAsync(Owner(db), new CreateTimeLogDto
        {
            TaskDescription = "Morning standup",
            Duration = 1m,
            LoggedAt = EarlyMorningManila,
        });
        db.SimulateNewRequest();
        return db;
    }

    [Theory]
    [InlineData("Asia/Manila")]
    [InlineData(null)]
    public async Task A_morning_log_is_found_under_its_local_day(string? tz)
    {
        using var db = await WithEarlyMorningLogAsync();

        var onTheDay = await Logs(db).GetFilteredAsync(
            Owner(db), new TimeLogQueryDto { From = Oct26, To = Oct26, Tz = tz });
        var dayBefore = await Logs(db).GetFilteredAsync(
            Owner(db), new TimeLogQueryDto { From = Oct25, To = Oct25, Tz = tz });

        onTheDay.TotalCount.Should().Be(1);
        dayBefore.TotalCount.Should().Be(0, "its UTC date is not the day it was logged on");
    }

    [Fact]
    public async Task The_filter_follows_the_callers_zone()
    {
        using var db = await WithEarlyMorningLogAsync();

        // 23:30 UTC is 19:30 on the 25th in New York.
        var page = await Logs(db).GetFilteredAsync(
            Owner(db), new TimeLogQueryDto { From = Oct25, To = Oct25, Tz = "America/New_York" });

        page.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task The_csv_prints_the_local_time_that_was_entered()
    {
        using var db = await WithEarlyMorningLogAsync();

        var csv = Encoding.UTF8.GetString(await Logs(db).ExportCsvAsync(
            Owner(db), new TimeLogQueryDto { From = Oct26, To = Oct26, Tz = "Asia/Manila" }));

        csv.Should().Contain("\"2026-10-26 07:30\"");
    }

    [Fact]
    public async Task An_unknown_zone_falls_back_to_manila()
    {
        using var db = await WithEarlyMorningLogAsync();

        var page = await Logs(db).GetFilteredAsync(
            Owner(db), new TimeLogQueryDto { From = Oct26, To = Oct26, Tz = "Not/AZone" });

        page.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Accomplishments_group_on_the_local_day()
    {
        using var db = await WithEarlyMorningLogAsync();

        var range = await Accomplishments(db).GetAsync(TestDb.WorkerId, Oct26, Oct26);

        range.Days.Should().ContainSingle().Which.Date.Should().Be(Oct26);
    }
}
