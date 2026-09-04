using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Tokens;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    /// <summary>
    /// Personal access tokens for non-browser clients.
    ///
    /// Behind "WorkSession", which accepts a login JWT only. A PAT must not reach
    /// this controller: a read-only token that could issue tokens would simply
    /// mint itself a write-scoped one, and the scope split would mean nothing.
    /// </summary>
    [ApiController]
    [Route("api/work/tokens")]
    [Authorize(Policy = "WorkSession")]
    [EnableRateLimiting("work-api")]
    public class WorkTokensController : ControllerBase
    {
        private readonly IPatService _service;
        private readonly ILogger<WorkTokensController> _logger;

        public WorkTokensController(IPatService service, ILogger<WorkTokensController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private int UserId => User.GetWorkUserId();

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync(UserId);
            return Ok(ApiResponse<IEnumerable<PatDto>>.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePatDto dto)
        {
            var result = await _service.CreateAsync(UserId, dto);

            // The name and prefix are logged; the token itself never is.
            _logger.LogInformation(
                "Personal access token issued: {Name} ({Prefix})", result.Name, result.Prefix);

            return Ok(ApiResponse<CreatedPatDto>.Created(
                result, "Token created. Copy it now — it cannot be shown again."));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Revoke(int id)
        {
            await _service.RevokeAsync(UserId, id);
            _logger.LogInformation("Personal access token revoked: {Id}", id);
            return Ok(ApiResponse.OkMessage("Token revoked"));
        }
    }
}
