using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
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

        [HttpGet]
        public async Task<IActionResult> GetAllPublished()
        {
            var posts = await _postService.GetAllPublishedAsync();
            return Ok(ApiResponse<IEnumerable<PostDto>>.Ok(posts));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            await _postService.IncrementViewCountAsync(id);
            var post = await _postService.GetPostWithDetailsAsync(id);
            return Ok(ApiResponse<PostWithDetailsDto>.Ok(post!));
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetByTripId(int tripId)
        {
            var posts = await _postService.GetByTripIdAsync(tripId);
            return Ok(ApiResponse<IEnumerable<PostDto>>.Ok(posts));
        }

        [Authorize]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var posts = await _postService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<PostDto>>.Ok(posts));
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePostDto request)
        {
            var validation = await _createValidator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var userId = ClaimsHelper.GetUserId(User);
            var post = await _postService.CreateAsync(request, userId);
            _logger.LogInformation("Post created: {Title}", request.Title);
            return CreatedAtAction(nameof(GetById), new { id = post.Id },
                ApiResponse<PostDto>.Created(post, "Post created successfully"));
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePostDto request)
        {
            var validation = await _updateValidator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var userId = ClaimsHelper.GetUserId(User);
            var post = await _postService.UpdateAsync(id, request, userId);
            _logger.LogInformation("Post updated: {Id}", id);
            return Ok(ApiResponse<PostDto>.Ok(post, "Post updated successfully"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _postService.DeleteAsync(id, userId);
            _logger.LogInformation("Post deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Post deleted successfully"));
        }

        [Authorize]
        [HttpPut("{id}/publish")]
        public async Task<IActionResult> Publish(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _postService.PublishAsync(id, userId);
            _logger.LogInformation("Post published: {Id}", id);
            return Ok(ApiResponse.OkMessage("Post published successfully"));
        }

        [Authorize]
        [HttpPut("{id}/unpublish")]
        public async Task<IActionResult> Unpublish(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _postService.UnpublishAsync(id, userId);
            _logger.LogInformation("Post unpublished: {Id}", id);
            return Ok(ApiResponse.OkMessage("Post unpublished successfully"));
        }
    }
}