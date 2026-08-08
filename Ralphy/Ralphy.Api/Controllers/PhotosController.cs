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
        /// A random sample of published photographs. Drives the home page
        /// slideshow, which draws from the whole library rather than from post
        /// cover images.
        /// </summary>
        [HttpGet("random")]
        [ResponseCache(Duration = 60)]
        public async Task<IActionResult> GetRandom([FromQuery] int count = 10)
        {
            var photos = await _photoService.GetRandomAsync(count);
            return Ok(ApiResponse<IEnumerable<FeaturedPhotoDto>>.Ok(photos));
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

        /// <summary>
        /// How many photos predate dimension recording. Drives the admin
        /// maintenance card, which stays hidden when the answer is zero.
        /// </summary>
        [Authorize]
        [HttpGet("dimensions/status")]
        public async Task<IActionResult> GetDimensionStatus()
        {
            var status = await _photoService.GetDimensionStatusAsync();
            return Ok(ApiResponse<DimensionStatusDto>.Ok(status));
        }

        /// <summary>
        /// Reads width and height back from Cloudinary for photos uploaded
        /// before the app kept them. Idempotent — it only touches rows still
        /// missing them — so it is safe to call until Remaining is zero.
        /// </summary>
        [Authorize]
        [HttpPost("dimensions/backfill")]
        public async Task<IActionResult> BackfillDimensions(
            [FromQuery] int batchSize = 25)
        {
            var result = await _photoService.BackfillDimensionsAsync(batchSize);

            _logger.LogInformation(
                "Dimension backfill: {Updated}/{Scanned} filled, {Remaining} left",
                result.Updated, result.Scanned, result.Remaining);

            return Ok(ApiResponse<DimensionBackfillDto>.Ok(
                result, result.Updated + " photo(s) updated"));
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
