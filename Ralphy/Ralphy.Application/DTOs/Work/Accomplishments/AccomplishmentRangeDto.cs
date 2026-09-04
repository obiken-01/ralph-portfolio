namespace Ralphy.Application.DTOs.Work.Accomplishments
{
    /// <summary>
    /// Shaped to drop straight into the accomplishment-report skill, replacing its
    /// CSV parsing. Always self-scoped — this never widens via project membership.
    /// </summary>
    public class AccomplishmentRangeDto
    {
        public DateOnly From { get; set; }
        public DateOnly To { get; set; }
        public decimal TotalHours { get; set; }
        public List<AccomplishmentDayDto> Days { get; set; } = new();
    }
}
