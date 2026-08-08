using AutoMapper;
using Ralphy.Application.DTOs.Locations;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    /// <summary>
    /// Locations are shared reference data since v2.0 — they no longer belong
    /// to a trip or to a single user, so there is no per-row owner to check.
    /// Any authenticated admin may manage them; the controller's [Authorize]
    /// is the whole authorization story.
    /// </summary>
    public class LocationService : ILocationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public LocationService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<LocationDto>> GetAllAsync()
        {
            var locations = await _unitOfWork.Locations.GetAllLocationsAsync();
            return _mapper.Map<IEnumerable<LocationDto>>(locations);
        }

        /// <summary>
        /// Public map feed. Excludes the placeholder, or the live site shows a
        /// pin cluster floating in the Mindoro Strait until cleanup finishes.
        /// </summary>
        public async Task<IEnumerable<LocationDto>> GetPublicAsync()
        {
            var locations = await _unitOfWork.Locations.GetPublicAsync();
            return _mapper.Map<IEnumerable<LocationDto>>(locations);
        }

        public async Task<LocationDto> GetByIdAsync(int id)
        {
            var location = await _unitOfWork.Locations.GetByIdAsync(id);
            if (location == null)
                throw new KeyNotFoundException($"Location with ID {id} not found");

            return _mapper.Map<LocationDto>(location);
        }

        public async Task<LocationDto> CreateAsync(CreateLocationDto request)
        {
            var location = _mapper.Map<Location>(request);

            await _unitOfWork.Locations.AddAsync(location);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<LocationDto>(location);
        }

        public async Task<LocationDto> UpdateAsync(int id, CreateLocationDto request)
        {
            var location = await _unitOfWork.Locations.GetByIdAsync(id);
            if (location == null)
                throw new KeyNotFoundException($"Location with ID {id} not found");

            _mapper.Map(request, location);
            location.UpdatedAt = DateTime.UtcNow;

            // Editing the placeholder into a real place is a legitimate way to
            // resolve it, so clear the flag once it has a name of its own.
            if (location.IsPlaceholder)
                location.IsPlaceholder = false;

            await _unitOfWork.Locations.UpdateAsync(location);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<LocationDto>(location);
        }

        public async Task DeleteAsync(int id)
        {
            var location = await _unitOfWork.Locations.GetByIdAsync(id);
            if (location == null)
                throw new KeyNotFoundException($"Location with ID {id} not found");

            // Post.LocationId is a Restrict FK. Catch this here so the caller
            // gets a sentence instead of an opaque DbUpdateException.
            if (await _unitOfWork.Locations.HasPostsAsync(id))
                throw new InvalidOperationException(
                    "This location still has posts. Move them to another place "
                    + "before deleting it.");

            await _unitOfWork.Locations.DeleteAsync(location);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
