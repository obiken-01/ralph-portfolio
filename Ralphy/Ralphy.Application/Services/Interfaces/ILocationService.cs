using Ralphy.Application.DTOs.Locations;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ILocationService
    {
        Task<IEnumerable<LocationDto>> GetAllAsync();

        Task<IEnumerable<LocationDto>> GetByTripIdAsync(int tripId);

        Task<LocationDto> CreateAsync(CreateLocationDto request, int userId);

        Task<LocationDto> UpdateAsync(int id, CreateLocationDto request, int userId);

        Task DeleteAsync(int id, int userId);
    }
}