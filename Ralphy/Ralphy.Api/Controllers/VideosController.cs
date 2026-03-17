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

        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            var videos = await _videoService.GetVideosByPostIdAsync(postId);
            return Ok(videos);
        }

        [HttpGet("post/{postId}/phone")]
        public async Task<IActionResult> GetPhoneVideos(int postId)
        {
            var videos = await _videoService.GetBySourceAsync(postId, MediaSource.Phone);
            return Ok(videos);
        }

        [HttpGet("post/{postId}/drone")]
        public async Task<IActionResult> GetDroneVideos(int postId)
        {
            var videos = await _videoService.GetBySourceAsync(postId, MediaSource.Drone);
            return Ok(videos);
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
                return BadRequest(new { StatusCode = 400, Message = "No file provided" });

            if (!Enum.TryParse<MediaSource>(source, true, out var mediaSource))
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Invalid source. Use 'Phone' or 'Drone'"
                });

            var userId = ClaimsHelper.GetUserId(User);
            var video = await _videoService.UploadVideoAsync(
                file, postId, mediaSource, caption, userId);

            _logger.LogInformation(
                "Video uploaded for post {PostId} from {Source}", postId, source);

            return Ok(video);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _videoService.DeleteAsync(id, userId);
            _logger.LogInformation("Video deleted: {Id}", id);
            return Ok(new { StatusCode = 200, Message = "Video deleted successfully" });
        }
    }
}