using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Accomplishments;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    /// <summary>
    /// Always self-scoped. There is no route parameter for whose accomplishments
    /// to read, and there should never be one — this is what the caller did.
    /// </summary>
    [ApiController]
    [Route("api/work/accomplishments")]
    [Authorize(Policy = "WorkUser")]
    [EnableRateLimiting("work-api")]
    public class WorkAccomplishmentsController : ControllerBase
    {
        private readonly IAccomplishmentService _service;

        public WorkAccomplishmentsController(IAccomplishmentService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] DateOnly from, [FromQuery] DateOnly to)
        {
            var result = await _service.GetAsync(User.GetWorkUserId(), from, to);
            return Ok(ApiResponse<AccomplishmentRangeDto>.Ok(result));
        }
    }
}
