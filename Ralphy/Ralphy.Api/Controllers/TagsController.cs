using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Tags;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TagsController : ControllerBase
    {
        private readonly ITagService _tagService;
        private readonly IValidator<CreateTagDto> _createValidator;
        private readonly ILogger<TagsController> _logger;

        public TagsController(
            ITagService tagService,
            IValidator<CreateTagDto> createValidator,
            ILogger<TagsController> logger)
        {
            _tagService = tagService;
            _createValidator = createValidator;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var tags = await _tagService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<TagDto>>.Ok(tags));
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTagDto request)
        {
            var validation = await _createValidator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var tag = await _tagService.CreateAsync(request);
            _logger.LogInformation("Tag created: {Name}", request.Name);
            return Ok(ApiResponse<TagDto>.Ok(tag, "Tag created successfully"));
        }

        [Authorize]
        [HttpPost("assign/{postId}")]
        public async Task<IActionResult> AssignTags(
            int postId, [FromBody] AssignTagDto request)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _tagService.AssignTagsToPostAsync(postId, request, userId);
            _logger.LogInformation("Tags assigned to post: {PostId}", postId);
            return Ok(ApiResponse.OkMessage("Tags assigned successfully"));
        }

        [Authorize]
        [HttpDelete("remove/{postId}")]
        public async Task<IActionResult> RemoveTags(int postId)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _tagService.RemoveTagsFromPostAsync(postId, userId);
            _logger.LogInformation("Tags removed from post: {PostId}", postId);
            return Ok(ApiResponse.OkMessage("Tags removed successfully"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _tagService.DeleteAsync(id);
            _logger.LogInformation("Tag deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Tag deleted successfully"));
        }
    }
}