using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ILocationRepository : IBaseRepository<Location>
    {
        Task<IEnumerable<Location>> GetAllLocationsAsync();

        Task<IEnumerable<Location>> GetByTripIdAsync(int tripId);
    }
}