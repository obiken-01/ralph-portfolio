using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
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

        public PhotosController(
            IPhotoService photoService,
            ILogger<PhotosController> logger)
        {
            _photoService = photoService;
            _logger = logger;
        }

        // Public endpoint
        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            try
            {
                var photos = await _photoService.GetByPostIdAsync(postId);
                return Ok(photos);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }

        // Admin endpoints
        [Authorize]
        [HttpPost("upload/{postId}")]
        public async Task<IActionResult> Upload(
            int postId,
            IFormFile file,
            [FromForm] string source,
            [FromForm] string? caption = null)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "No file provided"
                });
            }

            // Parse source
            if (!Enum.TryParse<MediaSource>(source, true, out var mediaSource))
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Invalid source. Use 'Phone' or 'Drone'"
                });
            }

            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                var photo = await _photoService.UploadPhotoAsync(
                    file, postId, mediaSource, caption, userId);

                _logger.LogInformation(
                    "Photo uploaded for post {PostId} from {Source}",
                    postId, source);

                return Ok(photo);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { StatusCode = 400, Message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { StatusCode = 401, Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { StatusCode = 400, Message = ex.Message });
            }
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                await _photoService.DeleteAsync(id, userId);
                _logger.LogInformation("Photo deleted: {Id}", id);
                return Ok(new
                {
                    StatusCode = 200,
                    Message = "Photo deleted successfully"
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { StatusCode = 401, Message = ex.Message });
            }
        }
    }
}