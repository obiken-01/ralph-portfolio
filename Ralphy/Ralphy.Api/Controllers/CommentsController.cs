using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
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

        // Public endpoints
        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetByPostId(int postId)
        {
            try
            {
                var comments = await _commentService.GetByPostIdAsync(postId);
                return Ok(comments);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }

        [HttpPost("post/{postId}")]
        public async Task<IActionResult> Create(
            int postId, [FromBody] CreateCommentDto request)
        {
            var validationResult = await _validator.ValidateAsync(request);
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
                var comment = await _commentService.CreateAsync(postId, request);
                _logger.LogInformation(
                    "Comment added to post: {PostId} by {Author}",
                    postId, request.AuthorName);
                return Ok(comment);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { StatusCode = 400, Message = ex.Message });
            }
        }

        // Admin endpoint
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                await _commentService.DeleteAsync(id, userId);
                _logger.LogInformation("Comment deleted: {Id}", id);
                return Ok(new
                {
                    StatusCode = 200,
                    Message = "Comment deleted successfully"
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