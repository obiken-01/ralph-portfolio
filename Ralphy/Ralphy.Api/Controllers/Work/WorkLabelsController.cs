using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Labels;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    /// <summary>
    /// Labels are workspace-wide, so any authenticated work user manages them.
    /// Scoping them per user would let three people create "urgent" in three
    /// colours and break cross-project filtering.
    /// </summary>
    [ApiController]
    [Route("api/work/labels")]
    [Authorize(Policy = "WorkRead")]
    [EnableRateLimiting("work-api")]
    public class WorkLabelsController : ControllerBase
    {
        private readonly ILabelService _service;

        public WorkLabelsController(ILabelService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<LabelDto>>.Ok(result));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SaveLabelDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(ApiResponse<LabelDto>.Created(result, "Label created"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] SaveLabelDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return Ok(ApiResponse<LabelDto>.Ok(result, "Label updated"));
        }

        [Authorize(Policy = "WorkWrite")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return Ok(ApiResponse.OkMessage("Label deleted"));
        }
    }
}
