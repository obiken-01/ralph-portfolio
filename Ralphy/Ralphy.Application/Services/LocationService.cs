using AutoMapper;
using Ralphy.Application.DTOs.Locations;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
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

        public async Task<IEnumerable<LocationDto>> GetByTripIdAsync(int tripId)
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(tripId);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {tripId} not found");

            var locations = await _unitOfWork.Locations.GetByTripIdAsync(tripId);
            return _mapper.Map<IEnumerable<LocationDto>>(locations);
        }

        public async Task<LocationDto> CreateAsync(CreateLocationDto request, int userId)
        {
            // Verify trip exists and belongs to user
            var trip = await _unitOfWork.Trips.GetByIdAsync(request.TripId);
            if (trip == null)
                throw new KeyNotFoundException(
                    $"Trip with ID {request.TripId} not found");

            if (trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to add locations to this trip");

            var location = _mapper.Map<Location>(request);

            await _unitOfWork.Locations.AddAsync(location);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<LocationDto>(location);
        }

        public async Task<LocationDto> UpdateAsync(
            int id, CreateLocationDto request, int userId)
        {
            var location = await _unitOfWork.Locations.GetByIdAsync(id);
            if (location == null)
                throw new KeyNotFoundException($"Location with ID {id} not found");

            var trip = await _unitOfWork.Trips.GetByIdAsync(location.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to update this location");

            _mapper.Map(request, location);
            location.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Locations.UpdateAsync(location);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<LocationDto>(location);
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var location = await _unitOfWork.Locations.GetByIdAsync(id);
            if (location == null)
                throw new KeyNotFoundException($"Location with ID {id} not found");

            var trip = await _unitOfWork.Trips.GetByIdAsync(location.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to delete this location");

            await _unitOfWork.Locations.DeleteAsync(location);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}