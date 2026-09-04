using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Directory;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    /// <summary>
    /// Exists so the assignee and member pickers do not have to call
    /// /api/work/admin/users, which needs a Ralphy admin token and returns far
    /// more than a picker should see. Read-only, and nothing but names and ids.
    /// </summary>
    [ApiController]
    [Route("api/work/users")]
    [Authorize(Policy = "WorkRead")]
    [EnableRateLimiting("work-api")]
    public class WorkDirectoryController : ControllerBase
    {
        private readonly IWorkUserService _service;

        public WorkDirectoryController(IWorkUserService service)
        {
            _service = service;
        }

        [HttpGet("directory")]
        public async Task<IActionResult> GetDirectory()
        {
            var result = await _service.GetDirectoryAsync();
            return Ok(ApiResponse<IEnumerable<WorkUserDirectoryDto>>.Ok(result));
        }
    }
}
