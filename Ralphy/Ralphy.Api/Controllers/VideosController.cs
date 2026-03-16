using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Enums;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VideosController : ControllerBase
    {
        private readonly IVideoService _videoService;
        private readonly ILogger<VideosController> _logger;

        public VideosController(
            IVideoService videoService,
            ILogger<VideosController> logger)
        {
            _videoService = videoService;
            _logger = logger;
        }

        // Public endpoint
        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            try
            {
                var videos = await _videoService.GetVideosByPostIdAsync(postId);
                return Ok(videos);
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
                var video = await _videoService.UploadVideoAsync(
                    file, postId, mediaSource, caption, userId);

                _logger.LogInformation(
                    "Video uploaded for post {PostId} from {Source}",
                    postId, source);

                return Ok(video);
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
                await _videoService.DeleteAsync(id, userId);
                _logger.LogInformation("Video deleted: {Id}", id);
                return Ok(new
                {
                    StatusCode = 200,
                    Message = "Video deleted successfully"
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { StatusCode = 400, Message = ex.Message });
            }
        }

        [HttpGet("post/{postId}/phone")]
        public async Task<IActionResult> GetPhoneVideos(int postId)
        {
            try
            {
                var videos = await _videoService.GetBySourceAsync(
                    postId, MediaSource.Phone);
                return Ok(videos);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }

        [HttpGet("post/{postId}/drone")]
        public async Task<IActionResult> GetDroneVideos(int postId)
        {
            try
            {
                var videos = await _videoService.GetBySourceAsync(
                    postId, MediaSource.Drone);
                return Ok(videos);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }
    }
}