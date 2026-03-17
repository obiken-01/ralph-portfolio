using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Enums;

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

        [HttpGet("post/{postId}/phone")]
        public async Task<IActionResult> GetPhonePhotos(int postId)
        {
            var photos = await _photoService.GetBySourceAsync(postId, MediaSource.Phone);
            return Ok(ApiResponse<IEnumerable<PhotoDto>>.Ok(photos));
        }

        [HttpGet("post/{postId}/drone")]
        public async Task<IActionResult> GetDronePhotos(int postId)
        {
            var photos = await _photoService.GetBySourceAsync(postId, MediaSource.Drone);
            return Ok(ApiResponse<IEnumerable<PhotoDto>>.Ok(photos));
        }

        [Authorize]
        [HttpPost("upload/{postId}")]
        public async Task<IActionResult> Upload(
            int postId,
            IFormFile file,
            [FromForm] string source,
            [FromForm] string? caption = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(400, "No file provided"));

            if (!Enum.TryParse<MediaSource>(source, true, out var mediaSource))
                return BadRequest(ApiResponse<object>.Fail(400,
                    "Invalid source. Use 'Phone' or 'Drone'"));

            var userId = ClaimsHelper.GetUserId(User);
            var photo = await _photoService.UploadPhotoAsync(
                file, postId, mediaSource, caption, userId);

            _logger.LogInformation("Photo uploaded for post {PostId} from {Source}",
                postId, source);

            return Ok(ApiResponse<PhotoDto>.Ok(photo, "Photo uploaded successfully"));
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