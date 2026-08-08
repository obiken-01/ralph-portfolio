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

        Task<PhotoDto> UpdateAsync(int id, UpdatePhotoDto request, int userId);

        Task ReorderAsync(int postId, ReorderPhotosDto request, int userId);

        Task DeleteAsync(int id, int userId);
    }
}
