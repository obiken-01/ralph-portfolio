using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work.Projects;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Enums;

namespace Ralphy.Api.Controllers.Work
{
    [ApiController]
    [Route("api/work/projects")]
    [Authorize(Policy = "WorkUser")]
    [EnableRateLimiting("work-api")]
    public class WorkProjectsController : ControllerBase
    {
        private readonly IProjectService _service;
        private readonly ILogger<WorkProjectsController> _logger;

        public WorkProjectsController(IProjectService service, ILogger<WorkProjectsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private int UserId => User.GetWorkUserId();

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] ProjectStatus? status, [FromQuery] string? search)
        {
            var result = await _service.GetAllAsync(UserId, status, search);
            return Ok(ApiResponse<IEnumerable<ProjectListItemDto>>.Ok(result));
        }

        [HttpGet("{publicId:guid}")]
        public async Task<IActionResult> Get(Guid publicId)
        {
            var result = await _service.GetAsync(UserId, publicId);
            return Ok(ApiResponse<ProjectDetailDto>.Ok(result));
        }

        [HttpGet("{publicId:guid}/timeline")]
        public async Task<IActionResult> Timeline(Guid publicId)
        {
            var result = await _service.GetTimelineAsync(UserId, publicId);
            return Ok(ApiResponse<ProjectTimelineDto>.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
        {
            var result = await _service.CreateAsync(UserId, dto);
            _logger.LogInformation("Project created: {PublicId}", result.PublicId);
            return Ok(ApiResponse<ProjectDetailDto>.Created(result, "Project created successfully"));
        }

        [HttpPut("{publicId:guid}")]
        public async Task<IActionResult> Update(Guid publicId, [FromBody] UpdateProjectDto dto)
        {
            var result = await _service.UpdateAsync(UserId, publicId, dto);
            _logger.LogInformation("Project updated: {PublicId}", publicId);
            return Ok(ApiResponse<ProjectDetailDto>.Ok(result, "Project updated successfully"));
        }

        [HttpDelete("{publicId:guid}")]
        public async Task<IActionResult> Delete(Guid publicId)
        {
            await _service.DeleteAsync(UserId, publicId);
            _logger.LogInformation("Project deleted: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("Project deleted successfully"));
        }

        // ── membership ───────────────────────────────────────────────

        [HttpGet("{publicId:guid}/members")]
        public async Task<IActionResult> GetMembers(Guid publicId)
        {
            var result = await _service.GetMembersAsync(UserId, publicId);
            return Ok(ApiResponse<IEnumerable<ProjectMemberDto>>.Ok(result));
        }

        [HttpPost("{publicId:guid}/members")]
        public async Task<IActionResult> AddMember(Guid publicId, [FromBody] AddProjectMemberDto dto)
        {
            var result = await _service.AddMemberAsync(UserId, publicId, dto);
            _logger.LogInformation("Member added to project {PublicId}", publicId);
            return Ok(ApiResponse<ProjectMemberDto>.Created(result, "Member added"));
        }

        [HttpPatch("{publicId:guid}/members/{userPublicId:guid}")]
        public async Task<IActionResult> UpdateMemberRole(
            Guid publicId, Guid userPublicId, [FromBody] UpdateMemberRoleDto dto)
        {
            var result = await _service.UpdateMemberRoleAsync(UserId, publicId, userPublicId, dto);
            return Ok(ApiResponse<ProjectMemberDto>.Ok(result, "Role updated"));
        }

        [HttpDelete("{publicId:guid}/members/{userPublicId:guid}")]
        public async Task<IActionResult> RemoveMember(Guid publicId, Guid userPublicId)
        {
            await _service.RemoveMemberAsync(UserId, publicId, userPublicId);
            return Ok(ApiResponse.OkMessage("Member removed"));
        }
    }
}
