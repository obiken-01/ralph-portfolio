using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.WorkItems;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Enums;

namespace Ralphy.Api.Controllers.Work
{
    /// <summary>
    /// The route is /tasks even though the entity is WorkItem — the C# name
    /// collision with System.Threading.Tasks.Task never needs to reach the URL.
    /// </summary>
    [ApiController]
    [Route("api/work/tasks")]
    [Authorize(Policy = "WorkRead")]
    [EnableRateLimiting("work-api")]
    public class WorkItemsController : ControllerBase
    {
        private readonly IWorkItemService _service;
        private readonly ILogger<WorkItemsController> _logger;

        public WorkItemsController(IWorkItemService service, ILogger<WorkItemsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private int UserId => User.GetWorkUserId();

        [HttpGet]
        public async Task<IActionResult> Query([FromQuery] WorkItemQueryDto query)
        {
            var result = await _service.QueryAsync(UserId, query);
            return Ok(ApiResponse<PagedResult<WorkItemCardDto>>.Ok(result));
        }

        [HttpGet("board")]
        public async Task<IActionResult> Board(
            [FromQuery] Guid? projectId, [FromQuery] string? assignee)
        {
            var result = await _service.GetBoardAsync(UserId, projectId, assignee);
            return Ok(ApiResponse<BoardDto>.Ok(result));
        }

        [HttpGet("{publicId:guid}")]
        public async Task<IActionResult> Get(Guid publicId)
        {
            var result = await _service.GetAsync(UserId, publicId);
            return Ok(ApiResponse<WorkItemDetailDto>.Ok(result));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateWorkItemDto dto)
        {
            var result = await _service.CreateAsync(UserId, dto);
            _logger.LogInformation("Work item created: {PublicId}", result.PublicId);
            return Ok(ApiResponse<WorkItemDetailDto>.Created(result, "Task created successfully"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPut("{publicId:guid}")]
        public async Task<IActionResult> Update(Guid publicId, [FromBody] UpdateWorkItemDto dto)
        {
            var result = await _service.UpdateAsync(UserId, publicId, dto);
            _logger.LogInformation("Work item updated: {PublicId}", publicId);
            return Ok(ApiResponse<WorkItemDetailDto>.Ok(result, "Task updated successfully"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPatch("{publicId:guid}/move")]
        public async Task<IActionResult> Move(Guid publicId, [FromBody] MoveWorkItemDto dto)
        {
            var result = await _service.MoveAsync(UserId, publicId, dto);
            return Ok(ApiResponse<WorkItemCardDto>.Ok(result, "Task moved"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPatch("{publicId:guid}/status")]
        public async Task<IActionResult> SetStatus(Guid publicId, [FromBody] UpdateStatusDto dto)
        {
            // A DTO rather than a bare [FromBody] enum: binding the enum directly
            // demanded the naked JSON literal "InProgress", and the natural
            // { "status": "InProgress" } bound nothing and fell through to
            // Backlog. The service signature is unchanged.
            var result = await _service.SetStatusAsync(UserId, publicId, dto.Status);
            return Ok(ApiResponse<WorkItemCardDto>.Ok(result, "Status updated"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPatch("{publicId:guid}/assignee")]
        public async Task<IActionResult> SetAssignee(Guid publicId, [FromBody] UpdateAssigneeDto dto)
        {
            var result = await _service.SetAssigneeAsync(UserId, publicId, dto);
            return Ok(ApiResponse<WorkItemCardDto>.Ok(result, "Assignee updated"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpDelete("{publicId:guid}")]
        public async Task<IActionResult> Delete(Guid publicId)
        {
            await _service.DeleteAsync(UserId, publicId);
            _logger.LogInformation("Work item deleted: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("Task deleted successfully"));
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export([FromQuery] WorkItemQueryDto query)
        {
            var csv = await _service.ExportCsvAsync(UserId, query);
            return File(csv, "text/csv", $"work-items-{DateTime.UtcNow:yyyyMMdd}.csv");
        }
    }
}
