using Ralphy.Application.DTOs.Locations;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ILocationService
    {
        Task<IEnumerable<LocationDto>> GetAllAsync();

        /// <summary>Places with published posts, placeholder excluded.</summary>
        Task<IEnumerable<LocationDto>> GetPublicAsync();

        Task<LocationDto> GetByIdAsync(int id);

        Task<LocationDto> CreateAsync(CreateLocationDto request);

        Task<LocationDto> UpdateAsync(int id, CreateLocationDto request);

        Task DeleteAsync(int id);
    }
}
