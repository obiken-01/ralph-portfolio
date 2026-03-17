using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Comments;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly ICommentService _commentService;
        private readonly IValidator<CreateCommentDto> _validator;
        private readonly ILogger<CommentsController> _logger;

        public CommentsController(
            ICommentService commentService,
            IValidator<CreateCommentDto> validator,
            ILogger<CommentsController> logger)
        {
            _commentService = commentService;
            _validator = validator;
            _logger = logger;
        }

        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            var comments = await _commentService.GetByPostIdAsync(postId);
            return Ok(ApiResponse<IEnumerable<CommentDto>>.Ok(comments));
        }

        [HttpPost("post/{postId}")]
        public async Task<IActionResult> Create(
            int postId, [FromBody] CreateCommentDto request)
        {
            var validation = await _validator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var comment = await _commentService.CreateAsync(postId, request);
            _logger.LogInformation("Comment added to post {PostId} by {Author}",
                postId, request.AuthorName);
            return Ok(ApiResponse<CommentDto>.Ok(comment, "Comment added successfully"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _commentService.DeleteAsync(id, userId);
            _logger.LogInformation("Comment deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Comment deleted successfully"));
        }
    }
}