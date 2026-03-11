using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.DTOs.Posts;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly IPostService _postService;
        private readonly IValidator<CreatePostDto> _createValidator;
        private readonly IValidator<UpdatePostDto> _updateValidator;
        private readonly ILogger<PostsController> _logger;

        public PostsController(
            IPostService postService,
            IValidator<CreatePostDto> createValidator,
            IValidator<UpdatePostDto> updateValidator,
            ILogger<PostsController> logger)
        {
            _postService = postService;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _logger = logger;
        }

        // Public endpoints
        [HttpGet]
        public async Task<IActionResult> GetAllPublished()
        {
            var posts = await _postService.GetAllPublishedAsync();
            return Ok(posts);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                await _postService.IncrementViewCountAsync(id);
                var post = await _postService.GetPostWithDetailsAsync(id);
                return Ok(post);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetByTripId(int tripId)
        {
            try
            {
                var posts = await _postService.GetByTripIdAsync(tripId);
                return Ok(posts);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }

        // Admin endpoints
        [Authorize]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var posts = await _postService.GetAllAsync();
            return Ok(posts);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePostDto request)
        {
            var validationResult = await _createValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Validation failed",
                    Errors = validationResult.Errors.Select(e => e.ErrorMessage)
                });
            }

            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                var post = await _postService.CreateAsync(request, userId);
                _logger.LogInformation("Post created: {Title}", request.Title);
                return CreatedAtAction(nameof(GetById), new { id = post.Id }, post);
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

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePostDto request)
        {
            var validationResult = await _updateValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Validation failed",
                    Errors = validationResult.Errors.Select(e => e.ErrorMessage)
                });
            }

            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                var post = await _postService.UpdateAsync(id, request, userId);
                _logger.LogInformation("Post updated: {Id}", id);
                return Ok(post);
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

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                await _postService.DeleteAsync(id, userId);
                _logger.LogInformation("Post deleted: {Id}", id);
                return Ok(new { StatusCode = 200, Message = "Post deleted successfully" });
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

        [Authorize]
        [HttpPut("{id}/publish")]
        public async Task<IActionResult> Publish(int id)
        {
            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                await _postService.PublishAsync(id, userId);
                _logger.LogInformation("Post published: {Id}", id);
                return Ok(new { StatusCode = 200, Message = "Post published successfully" });
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

        [Authorize]
        [HttpPut("{id}/unpublish")]
        public async Task<IActionResult> Unpublish(int id)
        {
            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                await _postService.UnpublishAsync(id, userId);
                _logger.LogInformation("Post unpublished: {Id}", id);
                return Ok(new { StatusCode = 200, Message = "Post unpublished successfully" });
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