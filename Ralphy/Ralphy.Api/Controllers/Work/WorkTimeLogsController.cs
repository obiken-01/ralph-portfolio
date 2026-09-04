using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    [ApiController]
    [Route("api/work/logs")]
    // DEPRECATED alias — the tools site calls this until the Netlify cutover.
    // Remove in the follow-up commit once WM-B07 verifies the new prefix.
    [Route("api/timekeeping/logs")]
    [Authorize]
    public class WorkTimeLogsController : ControllerBase
    {
        private readonly ITimeLogService _timeLogService;
        private readonly IUnitOfWork _uow;
        private readonly ILogger<WorkTimeLogsController> _logger;

        public WorkTimeLogsController(
            ITimeLogService timeLogService,
            IUnitOfWork uow,
            ILogger<WorkTimeLogsController> logger)
        {
            _timeLogService = timeLogService;
            _uow = uow;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetFiltered([FromQuery] TimeLogQueryDto query)
        {
            var publicId = await GetWorkUserPublicIdAsync();
            if (publicId == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "Unauthorized"));

            var result = await _timeLogService.GetFilteredAsync(publicId.Value, query);
            return Ok(ApiResponse<PagedTimeLogResultDto>.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTimeLogDto request)
        {
            var publicId = await GetWorkUserPublicIdAsync();
            if (publicId == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "Unauthorized"));

            var result = await _timeLogService.CreateAsync(publicId.Value, request);
            _logger.LogInformation("Time log created for user: {PublicId}", publicId);
            return Ok(ApiResponse<TimeLogDto>.Ok(result, "Time log created successfully"));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTimeLogDto request)
        {
            var publicId = await GetWorkUserPublicIdAsync();
            if (publicId == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "Unauthorized"));

            var result = await _timeLogService.UpdateAsync(publicId.Value, id, request);
            _logger.LogInformation("Time log updated: {Id}", id);
            return Ok(ApiResponse<TimeLogDto>.Ok(result, "Time log updated successfully"));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var publicId = await GetWorkUserPublicIdAsync();
            if (publicId == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "Unauthorized"));

            await _timeLogService.DeleteAsync(publicId.Value, id);
            _logger.LogInformation("Time log deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Time log deleted successfully"));
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export([FromQuery] TimeLogQueryDto query)
        {
            var publicId = await GetWorkUserPublicIdAsync();
            if (publicId == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "Unauthorized"));

            var csvBytes = await _timeLogService.ExportCsvAsync(publicId.Value, query);
            var from = query.From?.ToString("yyyy-MM-dd") ?? "all";
            var to = query.To?.ToString("yyyy-MM-dd") ?? "all";
            var fileName = $"timelogs-{from}-{to}.csv";

            return File(csvBytes, "text/csv", fileName);
        }

        // --- private helpers ---

        private async Task<Guid?> GetWorkUserPublicIdAsync()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;

            var tkUser = await _uow.WorkUsers.GetByIdAsync(userId);
            return tkUser?.PublicId;
        }
    }
}