using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.Photos;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IPhotoService
    {
        Task<PhotoDto> UploadPhotoAsync(
            IFormFile file,
            int postId,
            string? caption,
            PhotoMetadataDto? metadata,
            int userId);

        Task<IEnumerable<PhotoDto>> GetByPostIdAsync(int postId);

        /// <summary>A random sample of published images, for the home page.</summary>
        Task<IEnumerable<FeaturedPhotoDto>> GetRandomAsync(int count);

        Task<PhotoDto> UpdateAsync(int id, UpdatePhotoDto request, int userId);

        Task ReorderAsync(int postId, ReorderPhotosDto request, int userId);

        Task DeleteAsync(int id, int userId);

        /// <summary>How many photos still lack width and height.</summary>
        Task<DimensionStatusDto> GetDimensionStatusAsync();

        /// <summary>
        /// Fills width and height from Cloudinary for photos uploaded before
        /// the app recorded them. Safe to run repeatedly.
        /// </summary>
        Task<DimensionBackfillDto> BackfillDimensionsAsync(int batchSize);
    }
}
