namespace Ralphy.Application.Common
{
    /// <summary>
    /// Turns the calendar days a user picks into UTC instants, and back.
    ///
    /// LoggedAt is stored as UTC, but "October 26" means the user's October 26.
    /// A 7:30 AM log in Manila is 23:30 UTC the day before, so treating the filter
    /// dates as UTC days drops it from its own day and prints it on the wrong one
    /// in the CSV. Callers send their IANA zone; anything without one (the MCP
    /// server, older clients) gets Manila, which is where the logs are made.
    /// </summary>
    public static class WorkTimeZone
    {
        public const string DefaultId = "Asia/Manila";

        // Manila has had no DST since 1978, so a fixed +08:00 stands in if the
        // host has no tz database (a slim container image, say).
        private static readonly TimeZoneInfo Default = FindOrNull(DefaultId)
            ?? TimeZoneInfo.CreateCustomTimeZone(DefaultId, TimeSpan.FromHours(8), DefaultId, DefaultId);

        /// <summary>The named zone, or Manila when it is missing or unknown.</summary>
        public static TimeZoneInfo Resolve(string? id)
            => string.IsNullOrWhiteSpace(id) ? Default : FindOrNull(id.Trim()) ?? Default;

        /// <summary>The UTC instant at which <paramref name="date"/> begins in <paramref name="zone"/>.</summary>
        public static DateTime StartOfDayUtc(DateOnly date, TimeZoneInfo zone)
        {
            var local = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);

            // Where DST starts at midnight the day's first minutes do not exist;
            // the day then begins at the first one that does.
            while (zone.IsInvalidTime(local))
                local = local.AddMinutes(30);

            return TimeZoneInfo.ConvertTimeToUtc(local, zone);
        }

        /// <summary>A stored UTC timestamp as wall-clock time in <paramref name="zone"/>.</summary>
        public static DateTime ToLocal(DateTime utc, TimeZoneInfo zone)
            => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);

        private static TimeZoneInfo? FindOrNull(string id)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return null;
            }
        }
    }
}
