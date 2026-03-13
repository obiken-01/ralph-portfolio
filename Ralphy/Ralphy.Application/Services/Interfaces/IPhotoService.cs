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
            int userId);

        Task<IEnumerable<PhotoDto>> GetByPostIdAsync(int postId);

        Task DeleteAsync(int id, int userId);
    }
}