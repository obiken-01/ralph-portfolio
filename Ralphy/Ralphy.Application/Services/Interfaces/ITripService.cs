using Ralphy.Application.DTOs.Trips;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ITripService
    {
        Task<IEnumerable<TripDto>> GetAllPublishedAsync();

        Task<IEnumerable<TripDto>> GetAllAsync();

        Task<TripDto?> GetByIdAsync(int id);

        Task<TripDto?> GetTripWithPostsAsync(int id);

        Task<TripDto> CreateAsync(CreateTripDto request, int userId);

        Task<TripDto> UpdateAsync(int id, UpdateTripDto request, int userId);

        Task DeleteAsync(int id, int userId);

        Task PublishAsync(int id, int userId);

        Task UnpublishAsync(int id, int userId);
    }
}