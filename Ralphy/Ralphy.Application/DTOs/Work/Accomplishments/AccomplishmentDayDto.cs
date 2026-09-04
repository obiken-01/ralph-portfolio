namespace Ralphy.Application.DTOs.Work.Accomplishments
{
    public class AccomplishmentDayDto
    {
        public DateOnly Date { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;

        /// <summary>Flagged rather than dropped — the skill decides what to do with it.</summary>
        public bool IsWeekend { get; set; }

        public decimal TotalHours { get; set; }
        public List<AccomplishmentEntryDto> Entries { get; set; } = new();
    }
}
