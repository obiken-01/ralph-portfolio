using Microsoft.AspNetCore.Http;
using Ralphy.Domain.Models;

namespace Ralphy.Domain.Interfaces
{
    public interface ICloudinaryService
    {
        Task<CloudinaryUploadResult> UploadPhotoAsync(
            IFormFile file,
            string folder,
            string? publicId = null);

        Task<CloudinaryUploadResult> UploadVideoAsync(
            IFormFile file,
            string folder,
            string? publicId = null);

        Task<bool> DeleteMediaAsync(string publicId, bool isVideo = false);
    }
}