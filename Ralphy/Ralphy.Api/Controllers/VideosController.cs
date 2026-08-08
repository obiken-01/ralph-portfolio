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
    public class VideosController : ControllerBase
    {
        private readonly IVideoService _videoService;
        private readonly ILogger<VideosController> _logger;

        public VideosController(IVideoService videoService, ILogger<VideosController> logger)
        {
            _videoService = videoService;
            _logger = logger;
        }

        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            var videos = await _videoService.GetVideosByPostIdAsync(postId);
            return Ok(ApiResponse<IEnumerable<PhotoDto>>.Ok(videos));
        }

        [Authorize]
        [HttpPost("upload/{postId}")]
        public async Task<IActionResult> Upload(
            int postId,
            IFormFile file,
            [FromForm] string? caption = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(400, "No file provided"));

            var userId = ClaimsHelper.GetUserId(User);
            var video = await _videoService.UploadVideoAsync(
                file, postId, caption, userId);

            _logger.LogInformation("Video uploaded for post {PostId}", postId);

            return Ok(ApiResponse<PhotoDto>.Ok(video, "Video uploaded successfully"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _videoService.DeleteAsync(id, userId);
            _logger.LogInformation("Video deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Video deleted successfully"));
        }
    }
}