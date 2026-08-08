using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PhotosController : ControllerBase
    {
        private readonly IPhotoService _photoService;
        private readonly ILogger<PhotosController> _logger;

        public PhotosController(IPhotoService photoService, ILogger<PhotosController> logger)
        {
            _photoService = photoService;
            _logger = logger;
        }

        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            var photos = await _photoService.GetByPostIdAsync(postId);
            return Ok(ApiResponse<IEnumerable<PhotoDto>>.Ok(photos));
        }

        /// <summary>
        /// The EXIF fields are optional. The browser reads them off the original
        /// before compression strips them and posts them alongside the file, so
        /// the geotag and capture date survive the canvas round-trip.
        /// </summary>
        [Authorize]
        [HttpPost("upload/{postId}")]
        public async Task<IActionResult> Upload(
            int postId,
            IFormFile file,
            [FromForm] string? caption = null,
            [FromForm] DateTime? takenAt = null,
            [FromForm] double? latitude = null,
            [FromForm] double? longitude = null,
            [FromForm] int? sortOrder = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(400, "No file provided"));

            var metadata = new PhotoMetadataDto
            {
                TakenAt = takenAt,
                Latitude = latitude,
                Longitude = longitude,
                SortOrder = sortOrder,
            };

            var userId = ClaimsHelper.GetUserId(User);
            var photo = await _photoService.UploadPhotoAsync(
                file, postId, caption, metadata, userId);

            _logger.LogInformation("Photo uploaded for post {PostId}", postId);

            return Ok(ApiResponse<PhotoDto>.Ok(photo, "Photo uploaded successfully"));
        }

        [Authorize]
        [HttpPatch("{id}")]
        public async Task<IActionResult> Update(
            int id, [FromBody] UpdatePhotoDto request)
        {
            if (request.Caption is { Length: > 300 })
                return BadRequest(ApiResponse<object>.Fail(400,
                    "Caption cannot exceed 300 characters"));

            var userId = ClaimsHelper.GetUserId(User);
            var photo = await _photoService.UpdateAsync(id, request, userId);
            return Ok(ApiResponse<PhotoDto>.Ok(photo, "Photo updated successfully"));
        }

        [Authorize]
        [HttpPut("post/{postId}/order")]
        public async Task<IActionResult> Reorder(
            int postId, [FromBody] ReorderPhotosDto request)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _photoService.ReorderAsync(postId, request, userId);
            _logger.LogInformation("Photos reordered for post {PostId}", postId);
            return Ok(ApiResponse.OkMessage("Photo order updated"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _photoService.DeleteAsync(id, userId);
            _logger.LogInformation("Photo deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Photo deleted successfully"));
        }
    }
}
