using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ITripRepository : IBaseRepository<Trip>
    {
        Task<IEnumerable<Trip>> GetAllPublishedAsync();

        Task<Trip?> GetTripWithPostsAsync(int id);

        Task<IEnumerable<Trip>> GetByUserIdAsync(int userId);
    }
}