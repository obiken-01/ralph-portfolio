using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Domain.Enums;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IVideoService
    {
        Task<PhotoDto> UploadVideoAsync(
            IFormFile file,
            int postId,
            MediaSource source,
            string? caption,
            int userId);

        Task<IEnumerable<PhotoDto>> GetVideosByPostIdAsync(int postId);

        Task DeleteAsync(int id, int userId);
    }
}