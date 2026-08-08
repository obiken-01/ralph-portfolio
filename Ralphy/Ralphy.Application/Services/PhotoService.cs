using AutoMapper;
using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class PhotoService : IPhotoService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IMapper _mapper;

        public PhotoService(
            IUnitOfWork unitOfWork,
            ICloudinaryService cloudinaryService,
            IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _cloudinaryService = cloudinaryService;
            _mapper = mapper;
        }

        public async Task<PhotoDto> UploadPhotoAsync(
            IFormFile file,
            int postId,
            string? caption,
            PhotoMetadataDto? metadata,
            int userId)
        {
            var post = await RequireOwnedPostAsync(
                postId, userId, "upload photos to this post");

            ValidateMetadata(metadata);

            var uploadResult = await _cloudinaryService.UploadPhotoAsync(
                file,
                "ralphy/photos");

            var photo = new Photo
            {
                Url = uploadResult.Url,
                PublicId = uploadResult.PublicId,
                Caption = caption,
                Type = MediaType.Image,
                PostId = postId,
                // Cloudinary already measured the image on upload; keeping the
                // numbers is what lets the grid reserve the right box.
                Width = uploadResult.Width > 0 ? uploadResult.Width : (int?)null,
                Height = uploadResult.Height > 0 ? uploadResult.Height : (int?)null,
                TakenAt = ToUtc(metadata?.TakenAt),
                Latitude = metadata?.Latitude,
                Longitude = metadata?.Longitude,
                SortOrder = metadata?.SortOrder
                    ?? await NextSortOrderAsync(postId),
            };

            await _unitOfWork.Photos.AddAsync(photo);
            await _unitOfWork.SaveChangesAsync();

            // Post.TakenAt tracks the earliest shot on the post.
            await _unitOfWork.Posts.RecalculateTakenAtAsync(postId);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<PhotoDto>(photo);
        }

        public async Task<IEnumerable<PhotoDto>> GetByPostIdAsync(int postId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            var photos = await _unitOfWork.Photos.GetByPostIdAsync(postId);

            return _mapper.Map<IEnumerable<PhotoDto>>(
                photos.Where(p => p.Type == MediaType.Image));
        }

        public async Task<PhotoDto> UpdateAsync(
            int id, UpdatePhotoDto request, int userId)
        {
            var photo = await _unitOfWork.Photos.GetByIdAsync(id);
            if (photo == null)
                throw new KeyNotFoundException($"Photo with ID {id} not found");

            await RequireOwnedPostAsync(
                photo.PostId, userId, "edit this photo");

            photo.Caption = string.IsNullOrWhiteSpace(request.Caption)
                ? null
                : request.Caption.Trim();
            photo.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Photos.UpdateAsync(photo);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<PhotoDto>(photo);
        }

        public async Task ReorderAsync(
            int postId, ReorderPhotosDto request, int userId)
        {
            await RequireOwnedPostAsync(
                postId, userId, "reorder photos on this post");

            var photos = (await _unitOfWork.Photos.GetByPostIdAsync(postId))
                .Where(p => p.Type == MediaType.Image)
                .ToList();

            // A partial list would leave half the sequence rewritten and half
            // stale, so require an exact match before touching anything.
            var submitted = request.PhotoIds;
            if (submitted.Count != photos.Count
                || submitted.Distinct().Count() != submitted.Count
                || !submitted.OrderBy(x => x).SequenceEqual(
                        photos.Select(p => p.Id).OrderBy(x => x)))
            {
                throw new ArgumentException(
                    "The submitted photo ids must be exactly the post's photos, "
                    + "each listed once.");
            }

            for (var i = 0; i < submitted.Count; i++)
            {
                var photo = photos.First(p => p.Id == submitted[i]);
                photo.SortOrder = i;
                await _unitOfWork.Photos.UpdateAsync(photo);
            }

            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var photo = await _unitOfWork.Photos.GetByIdAsync(id);
            if (photo == null)
                throw new KeyNotFoundException($"Photo with ID {id} not found");

            await RequireOwnedPostAsync(
                photo.PostId, userId, "delete this photo");

            await _cloudinaryService.DeleteMediaAsync(photo.PublicId);

            var postId = photo.PostId;
            await _unitOfWork.Photos.DeleteAsync(photo);
            await _unitOfWork.SaveChangesAsync();

            await _unitOfWork.Posts.RecalculateTakenAtAsync(postId);
            await _unitOfWork.SaveChangesAsync();
        }

        // ── Private helpers ──────────────────────────────────────────

        private async Task<Post> RequireOwnedPostAsync(
            int postId, int userId, string action)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            if (post.UserId != userId)
                throw new UnauthorizedAccessException(
                    $"You are not authorized to {action}");

            return post;
        }

        private async Task<int> NextSortOrderAsync(int postId)
        {
            var existing = await _unitOfWork.Photos.GetByPostIdAsync(postId);
            return existing.Any() ? existing.Max(p => p.SortOrder) + 1 : 0;
        }

        /// <summary>
        /// Rejects out-of-range coordinates rather than clamping them — a
        /// clamped pin lands somewhere plausible and wrong.
        /// </summary>
        private static void ValidateMetadata(PhotoMetadataDto? metadata)
        {
            if (metadata == null) return;

            if (metadata.Latitude is < -90 or > 90)
                throw new ArgumentException("Latitude must be between -90 and 90");

            if (metadata.Longitude is < -180 or > 180)
                throw new ArgumentException("Longitude must be between -180 and 180");

            // One day of slack for a camera clock that runs fast or sits in
            // another timezone.
            if (metadata.TakenAt.HasValue
                && ToUtc(metadata.TakenAt)!.Value > DateTime.UtcNow.AddDays(1))
            {
                throw new ArgumentException("TakenAt cannot be in the future");
            }

            if (metadata.SortOrder is < 0)
                throw new ArgumentException("SortOrder cannot be negative");
        }

        /// <summary>Npgsql rejects unspecified-kind values on timestamptz columns.</summary>
        private static DateTime? ToUtc(DateTime? value) =>
            value.HasValue
                ? value.Value.Kind == DateTimeKind.Utc
                    ? value
                    : value.Value.ToUniversalTime()
                : null;
    }
}
