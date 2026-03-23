using AutoMapper;
using Ralphy.Application.DTOs.Trips;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class TripService : ITripService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TripService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<TripDto>> GetAllPublishedAsync()
        {
            var trips = await _unitOfWork.Trips.GetAllPublishedAsync();
            return _mapper.Map<IEnumerable<TripDto>>(trips);
        }

        public async Task<IEnumerable<TripDto>> GetAllAsync()
        {
            var trips = await _unitOfWork.Trips.GetAllAsync();
            return _mapper.Map<IEnumerable<TripDto>>(trips);
        }

        public async Task<TripDto?> GetByIdAsync(int id)
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(id);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {id} not found");

            return _mapper.Map<TripDto>(trip);
        }

        public async Task<TripDto?> GetTripWithPostsAsync(int id)
        {
            var trip = await _unitOfWork.Trips.GetTripWithPostsAsync(id);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {id} not found");

            return _mapper.Map<TripDto>(trip);
        }

        public async Task<TripDto> CreateAsync(CreateTripDto request, int userId)
        {
            var trip = _mapper.Map<Trip>(request);
            trip.UserId = userId;
            trip.Status = PostStatus.Draft;

            // ← ADD THESE: force UTC on dates
            trip.StartDate = DateTime.SpecifyKind(trip.StartDate, DateTimeKind.Utc);
            if (trip.EndDate.HasValue)
                trip.EndDate = DateTime.SpecifyKind(trip.EndDate.Value, DateTimeKind.Utc);

            await _unitOfWork.Trips.AddAsync(trip);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<TripDto>(trip);
        }

        public async Task<TripDto> UpdateAsync(int id, UpdateTripDto request, int userId)
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(id);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {id} not found");

            if (trip.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to update this trip");

            _mapper.Map(request, trip);
            trip.UpdatedAt = DateTime.UtcNow;

            // ← ADD THESE: force UTC on dates
            trip.StartDate = DateTime.SpecifyKind(trip.StartDate, DateTimeKind.Utc);
            if (trip.EndDate.HasValue)
                trip.EndDate = DateTime.SpecifyKind(trip.EndDate.Value, DateTimeKind.Utc);

            await _unitOfWork.Trips.UpdateAsync(trip);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<TripDto>(trip);
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(id);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {id} not found");

            if (trip.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to delete this trip");

            await _unitOfWork.Trips.DeleteAsync(trip);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task PublishAsync(int id, int userId)
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(id);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {id} not found");

            if (trip.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to publish this trip");

            trip.Status = PostStatus.Published;
            trip.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Trips.UpdateAsync(trip);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task UnpublishAsync(int id, int userId)
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(id);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {id} not found");

            if (trip.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to unpublish this trip");

            trip.Status = PostStatus.Draft;
            trip.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Trips.UpdateAsync(trip);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}