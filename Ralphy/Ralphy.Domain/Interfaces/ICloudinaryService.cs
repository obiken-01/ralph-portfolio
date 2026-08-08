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

        Task<CloudinaryUploadResult> UploadCvAsync(IFormFile file);

        Task<bool> DeleteMediaAsync(string publicId, bool isVideo = false);

        Task DeleteManyAsync(IEnumerable<string> publicIds, bool isVideo = false);

        Task DeleteCvAsync(string publicId);

        Task<CloudinaryUploadResult> UploadProfileImageAsync(IFormFile file);

        Task<CloudinaryUploadResult> UploadCoverImageAsync(IFormFile file);

        Task DeleteImageAsync(string publicId);

        /// <summary>
        /// Reads the stored dimensions of an asset already in Cloudinary.
        /// Used to backfill photos uploaded before the app recorded them.
        /// </summary>
        Task<MediaDimensions> GetDimensionsAsync(string publicId, bool isVideo = false);
    }
}