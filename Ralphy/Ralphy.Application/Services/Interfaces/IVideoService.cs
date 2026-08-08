using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.Photos;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IVideoService
    {
        Task<PhotoDto> UploadVideoAsync(
            IFormFile file,
            int postId,
            string? caption,
            int userId);

        Task<IEnumerable<PhotoDto>> GetVideosByPostIdAsync(int postId);

        Task DeleteAsync(int id, int userId);
    }
}