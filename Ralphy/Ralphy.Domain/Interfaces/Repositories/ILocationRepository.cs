using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ILocationRepository : IBaseRepository<Location>
    {
        Task<IEnumerable<Location>> GetAllLocationsAsync();

        /// <summary>Places with at least one published post, excluding the placeholder.</summary>
        Task<IEnumerable<Location>> GetPublicAsync();

        Task<bool> HasPostsAsync(int locationId);

        Task<Location?> GetPlaceholderAsync();
    }
}
