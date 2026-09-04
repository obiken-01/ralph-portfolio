namespace Ralphy.Application.DTOs.Work
{
    public class PagedTimeLogResultDto
    {
        public IEnumerable<TimeLogDto> Items { get; set; } = new List<TimeLogDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }
}