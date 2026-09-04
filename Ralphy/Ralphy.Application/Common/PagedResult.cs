namespace Ralphy.Application.Common
{
    /// <summary>
    /// Generic page envelope. The older PagedTimeLogResultDto predates this and is
    /// left alone; anything new uses this rather than restating the same five
    /// properties once per module.
    /// </summary>
    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
    }
}
