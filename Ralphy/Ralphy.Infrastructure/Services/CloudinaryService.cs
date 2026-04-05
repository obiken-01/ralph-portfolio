using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Models;
using Ralphy.Infrastructure.Settings;

namespace Ralphy.Infrastructure.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        private readonly CloudinarySettings _settings;
        private readonly ILogger<CloudinaryService> _logger;

        public CloudinaryService(
            Cloudinary cloudinary,
            IOptions<CloudinarySettings> settings,
            ILogger<CloudinaryService> logger)
        {
            _cloudinary = cloudinary;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<CloudinaryUploadResult> UploadPhotoAsync(
            IFormFile file,
            string folder,
            string? publicId = null)
        {
            ValidateImageFile(file);

            await using var stream = file.OpenReadStream();

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                PublicId = publicId,
                Overwrite = true,
                Transformation = new Transformation()
                    .Quality("auto")
                    .FetchFormat("auto")
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
            {
                _logger.LogError("Cloudinary upload error: {Error}",
                    result.Error.Message);
                throw new InvalidOperationException(
                    $"Photo upload failed: {result.Error.Message}");
            }

            _logger.LogInformation("Photo uploaded to Cloudinary: {PublicId}",
                result.PublicId);

            return new CloudinaryUploadResult
            {
                Url = result.SecureUrl.ToString(),
                PublicId = result.PublicId,
                Format = result.Format,
                Size = result.Bytes,
                Width = result.Width,
                Height = result.Height,
                ResourceType = "image"
            };
        }

        public async Task<CloudinaryUploadResult> UploadVideoAsync(
            IFormFile file,
            string folder,
            string? publicId = null)
        {
            ValidateVideoFile(file);

            await using var stream = file.OpenReadStream();

            var uploadParams = new VideoUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                PublicId = publicId,
                Overwrite = true,
                EagerAsync = true,
                EagerTransforms = new List<Transformation>
                {
                    new Transformation().Quality("auto")
                }
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
            {
                _logger.LogError("Cloudinary video upload error: {Error}",
                    result.Error.Message);
                throw new InvalidOperationException(
                    $"Video upload failed: {result.Error.Message}");
            }

            _logger.LogInformation("Video uploaded to Cloudinary: {PublicId}",
                result.PublicId);

            return new CloudinaryUploadResult
            {
                Url = result.SecureUrl.ToString(),
                PublicId = result.PublicId,
                Format = result.Format,
                Size = result.Bytes,
                ResourceType = "video"
            };
        }

        public async Task<CloudinaryUploadResult> UploadCvAsync(IFormFile file)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "ralphy/cv",
                PublicId = "ralph-alcaide-cv",
                Overwrite = true,
                AccessMode = "public"
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            return new CloudinaryUploadResult
            {
                Url = result.SecureUrl.ToString(),
                PublicId = result.PublicId
            };
        }

        public async Task<bool> DeleteMediaAsync(
            string publicId, bool isVideo = false)
        {
            var resourceType = isVideo
                ? ResourceType.Video
                : ResourceType.Image;

            var deleteParams = new DeletionParams(publicId)
            {
                ResourceType = resourceType
            };

            var result = await _cloudinary.DestroyAsync(deleteParams);

            if (result.Result == "ok")
            {
                _logger.LogInformation(
                    "Media deleted from Cloudinary: {PublicId}", publicId);
                return true;
            }

            _logger.LogWarning(
                "Failed to delete media from Cloudinary: {PublicId}", publicId);
            return false;
        }

        public async Task DeleteManyAsync(
            IEnumerable<string> publicIds, bool isVideo = false)
        {
            var resourceType = isVideo
                ? ResourceType.Video
                : ResourceType.Image;

            foreach (var publicId in publicIds)
            {
                var deleteParams = new DeletionParams(publicId)
                {
                    ResourceType = resourceType
                };

                var result = await _cloudinary.DestroyAsync(deleteParams);

                if (result.Result == "ok")
                {
                    _logger.LogInformation(
                        "Media deleted from Cloudinary: {PublicId}", publicId);
                }
                else
                {
                    _logger.LogWarning(
                        "Failed to delete media from Cloudinary: {PublicId}", publicId);
                }
            }
        }

        public async Task DeleteCvAsync(string publicId)
        {
            var deleteParams = new DeletionParams(publicId)
            {
                ResourceType = ResourceType.Raw
            };
            await _cloudinary.DestroyAsync(deleteParams);
        }

        public async Task<CloudinaryUploadResult> UploadProfileImageAsync(IFormFile file)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "ralphy/profile",
                PublicId = "ralph-alcaide-profile",
                Overwrite = true,
                AccessMode = "public"
            };
            var result = await _cloudinary.UploadAsync(uploadParams);
            return new CloudinaryUploadResult
            {
                Url = result.SecureUrl.ToString(),
                PublicId = result.PublicId
            };
        }

        public async Task<CloudinaryUploadResult> UploadCoverImageAsync(IFormFile file)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "ralphy/cover",
                PublicId = "ralph-alcaide-cover",
                Overwrite = true,
                AccessMode = "public"
            };
            var result = await _cloudinary.UploadAsync(uploadParams);
            return new CloudinaryUploadResult
            {
                Url = result.SecureUrl.ToString(),
                PublicId = result.PublicId
            };
        }

        public async Task DeleteImageAsync(string publicId)
        {
            var deleteParams = new DeletionParams(publicId)
            {
                ResourceType = ResourceType.Image
            };
            await _cloudinary.DestroyAsync(deleteParams);
        }

        // ── Private Helpers ──────────────────────────────────────────

        private static void ValidateImageFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("No file provided");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException(
                    $"Invalid file type. Allowed: {string.Join(", ", allowedExtensions)}");

            // Max 10MB for photos
            if (file.Length > 10 * 1024 * 1024)
                throw new ArgumentException("File size cannot exceed 10MB");
        }

        private static void ValidateVideoFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("No file provided");

            var allowedExtensions = new[] { ".mp4", ".mov", ".avi", ".mkv" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException(
                    $"Invalid file type. Allowed: {string.Join(", ", allowedExtensions)}");

            // Max 100MB for videos
            if (file.Length > 100 * 1024 * 1024)
                throw new ArgumentException("File size cannot exceed 100MB");
        }
    }
}