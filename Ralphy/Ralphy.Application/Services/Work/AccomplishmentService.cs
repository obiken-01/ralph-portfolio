using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Accomplishments;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services.Work
{
    /// <summary>
    /// Reshapes the caller's own time logs into the per-day form the
    /// accomplishment-report skill expects, so it can stop parsing CSV.
    ///
    /// Self-scoped, always. Project membership does not widen this — the report is
    /// about what one person did, and the endpoint takes no user parameter at all.
    /// </summary>
    public class AccomplishmentService : IAccomplishmentService
    {
        private readonly IUnitOfWork _uow;

        public AccomplishmentService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<AccomplishmentRangeDto> GetAsync(
            int userId, DateOnly from, DateOnly to, string? timeZone = null)
        {
            if (to < from)
                throw new ArgumentException("The end of the range cannot precede its start.");

            var zone = WorkTimeZone.Resolve(timeZone);
            var logs = await _uow.TimeLogs.GetForRangeAsync(
                userId,
                WorkTimeZone.StartOfDayUtc(from, zone),
                WorkTimeZone.StartOfDayUtc(to.AddDays(1), zone));

            // LoggedAt is stored UTC, so it is grouped on its local date: a 7:30 AM
            // Manila log is 23:30 UTC the day before, and its raw date would move
            // it across the day — or the cutoff — it was entered on.
            var days = logs
                .GroupBy(log => DateOnly.FromDateTime(WorkTimeZone.ToLocal(log.LoggedAt, zone)))
                .OrderBy(group => group.Key)
                .Select(BuildDay)
                .ToList();

            return new AccomplishmentRangeDto
            {
                From = from,
                To = to,
                TotalHours = days.Sum(d => d.TotalHours),
                Days = days,
            };
        }

        // --- private helpers ---

        private static AccomplishmentDayDto BuildDay(IGrouping<DateOnly, TimeLog> day)
        {
            var entries = day
                // Several logs against one task on one day are one accomplishment,
                // so they collapse into a single entry with their descriptions
                // merged. Unlinked legacy logs have no task to collapse onto and
                // each stay separate, which is also what the CSV path produced.
                .GroupBy(log => log.WorkItemId is null
                    ? $"log:{log.Id}"
                    : $"item:{log.WorkItemId}")
                .Select(BuildEntry)
                .OrderByDescending(entry => entry.Hours)
                .ThenBy(entry => entry.Title)
                .ToList();

            return new AccomplishmentDayDto
            {
                Date = day.Key,
                DayOfWeek = day.Key.DayOfWeek.ToString(),
                // Flagged, not dropped — the skill decides whether weekend work
                // belongs in the report.
                IsWeekend = day.Key.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday,
                TotalHours = entries.Sum(e => e.Hours),
                Entries = entries,
            };
        }

        private static AccomplishmentEntryDto BuildEntry(IGrouping<string, TimeLog> group)
        {
            var first = group.First();
            var item = first.WorkItem;

            return new AccomplishmentEntryDto
            {
                WorkItemPublicId = item?.PublicId,
                Title = item?.Title ?? first.TaskDescription,
                ProjectName = item?.Project?.Name,
                Status = item?.Status.ToString(),
                Hours = group.Sum(log => log.Duration),
                Descriptions = group
                    .Select(log => log.TaskDescription)
                    .Where(description => !string.IsNullOrWhiteSpace(description))
                    .Distinct()
                    .ToList(),
            };
        }
    }
}
