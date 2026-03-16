using AutoMapper;
using Ralphy.Application.DTOs.Posts;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class PostService : IPostService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ICloudinaryService _cloudinaryService;

        public PostService(
            IUnitOfWork unitOfWork, 
            IMapper mapper,
            ICloudinaryService cloudinaryService)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _cloudinaryService = cloudinaryService;
        }

        public async Task<IEnumerable<PostDto>> GetAllPublishedAsync()
        {
            var posts = await _unitOfWork.Posts.GetAllPublishedAsync();
            return _mapper.Map<IEnumerable<PostDto>>(posts);
        }

        public async Task<IEnumerable<PostDto>> GetAllAsync()
        {
            var posts = await _unitOfWork.Posts.GetAllAsync();
            return _mapper.Map<IEnumerable<PostDto>>(posts);
        }

        public async Task<PostDto?> GetByIdAsync(int id)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            return _mapper.Map<PostDto>(post);
        }

        public async Task<PostWithDetailsDto?> GetPostWithDetailsAsync(int id)
        {
            var post = await _unitOfWork.Posts.GetPostWithDetailsAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            return _mapper.Map<PostWithDetailsDto>(post);
        }

        public async Task<IEnumerable<PostDto>> GetByTripIdAsync(int tripId)
        {
            // Verify trip exists
            var trip = await _unitOfWork.Trips.GetByIdAsync(tripId);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {tripId} not found");

            var posts = await _unitOfWork.Posts.GetByTripIdAsync(tripId);
            return _mapper.Map<IEnumerable<PostDto>>(posts);
        }

        public async Task<PostDto> CreateAsync(CreatePostDto request, int userId)
        {
            // Verify trip exists and belongs to user
            var trip = await _unitOfWork.Trips.GetByIdAsync(request.TripId);
            if (trip == null)
                throw new KeyNotFoundException($"Trip with ID {request.TripId} not found");

            if (trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to add posts to this trip");

            var post = _mapper.Map<Post>(request);
            post.Status = PostStatus.Draft;

            await _unitOfWork.Posts.AddAsync(post);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<PostDto>(post);
        }

        public async Task<PostDto> UpdateAsync(int id, UpdatePostDto request, int userId)
        {
            var post = await _unitOfWork.Posts.GetPostWithDetailsAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            // Verify ownership through trip
            var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to update this post");

            _mapper.Map(request, post);
            post.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Posts.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<PostDto>(post);
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var post = await _unitOfWork.Posts.GetPostWithDetailsAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to delete this post");

            // Delete all photos from Cloudinary
            var imagePublicIds = post.Photos
                .Where(p => p.Type == MediaType.Image)
                .Select(p => p.PublicId);

            var videoPublicIds = post.Photos
                .Where(p => p.Type == MediaType.Video)
                .Select(p => p.PublicId);

            if (imagePublicIds.Any())
                await _cloudinaryService.DeleteManyAsync(imagePublicIds);

            if (videoPublicIds.Any())
                await _cloudinaryService.DeleteManyAsync(videoPublicIds, isVideo: true);

            // Delete post from DB (cascade deletes photos, comments, tags)
            await _unitOfWork.Posts.DeleteAsync(post);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task PublishAsync(int id, int userId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to publish this post");

            post.Status = PostStatus.Published;
            post.PublishedAt = DateTime.UtcNow;
            post.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Posts.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task UnpublishAsync(int id, int userId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to unpublish this post");

            post.Status = PostStatus.Draft;
            post.PublishedAt = null;
            post.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Posts.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task IncrementViewCountAsync(int id)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(id);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {id} not found");

            await _unitOfWork.Posts.IncrementViewCountAsync(id);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}