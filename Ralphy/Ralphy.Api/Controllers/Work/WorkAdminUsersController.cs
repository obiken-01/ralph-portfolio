using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    [ApiController]
    [Route("api/work/admin/users")]
    // DEPRECATED alias — the tools site calls this until the Netlify cutover.
    // Remove in the follow-up commit once WM-B07 verifies the new prefix.
    [Route("api/timekeeping/admin/users")]
    [Authorize]
    public class WorkAdminUsersController : ControllerBase
    {
        private readonly IWorkUserService _userService;
        private readonly ILogger<WorkAdminUsersController> _logger;

        public WorkAdminUsersController(
            IWorkUserService userService,
            ILogger<WorkAdminUsersController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<WorkUserDto>>.Ok(users));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateWorkUserDto request)
        {
            var user = await _userService.CreateAsync(request);
            _logger.LogInformation("Work user created: {Username}", request.Username);
            return Ok(ApiResponse<WorkUserDto>.Ok(user, "User created successfully"));
        }

        [HttpPut("{publicId}")]
        public async Task<IActionResult> Update(Guid publicId, [FromBody] UpdateWorkUserDto request)
        {
            var user = await _userService.UpdateAsync(publicId, request);
            _logger.LogInformation("Work user updated: {PublicId}", publicId);
            return Ok(ApiResponse<WorkUserDto>.Ok(user, "User updated successfully"));
        }

        [HttpPost("{publicId}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid publicId, [FromBody] ResetWorkPasswordDto request)
        {
            await _userService.ResetPasswordAsync(publicId, request);
            _logger.LogInformation("Work user password reset: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("Password reset successfully"));
        }

        [HttpPatch("{publicId}/activate")]
        public async Task<IActionResult> Activate(Guid publicId)
        {
            await _userService.ActivateAsync(publicId);
            _logger.LogInformation("Work user activated: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("User activated successfully"));
        }

        [HttpPatch("{publicId}/deactivate")]
        public async Task<IActionResult> Deactivate(Guid publicId)
        {
            await _userService.DeactivateAsync(publicId);
            _logger.LogInformation("Work user deactivated: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("User deactivated successfully"));
        }

        [HttpDelete("{publicId}")]
        public async Task<IActionResult> Delete(Guid publicId)
        {
            await _userService.DeleteAsync(publicId);
            _logger.LogInformation("Work user deleted: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("User deleted successfully"));
        }
    }
}
