using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Domain.Enums;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IPhotoService
    {
        Task<PhotoDto> UploadPhotoAsync(
            IFormFile file,
            int postId,
            MediaSource source,
            string? caption,
            PhotoMetadataDto? metadata,
            int userId);

        Task<IEnumerable<PhotoDto>> GetByPostIdAsync(int postId);

        Task<IEnumerable<PhotoDto>> GetBySourceAsync(int postId, MediaSource source);

        Task<PhotoDto> UpdateAsync(int id, UpdatePhotoDto request, int userId);

        Task ReorderAsync(int postId, ReorderPhotosDto request, int userId);

        Task DeleteAsync(int id, int userId);
    }
}
