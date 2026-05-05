using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Timekeeping;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/timekeeping/admin/users")]
    [Authorize]
    public class TimekeepingAdminController : ControllerBase
    {
        private readonly ITimekeepingUserService _userService;
        private readonly ILogger<TimekeepingAdminController> _logger;

        public TimekeepingAdminController(
            ITimekeepingUserService userService,
            ILogger<TimekeepingAdminController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<TimekeepingUserDto>>.Ok(users));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTimekeepingUserDto request)
        {
            var user = await _userService.CreateAsync(request);
            _logger.LogInformation("Timekeeping user created: {Username}", request.Username);
            return Ok(ApiResponse<TimekeepingUserDto>.Ok(user, "User created successfully"));
        }

        [HttpPut("{publicId}")]
        public async Task<IActionResult> Update(Guid publicId, [FromBody] UpdateTimekeepingUserDto request)
        {
            var user = await _userService.UpdateAsync(publicId, request);
            _logger.LogInformation("Timekeeping user updated: {PublicId}", publicId);
            return Ok(ApiResponse<TimekeepingUserDto>.Ok(user, "User updated successfully"));
        }

        [HttpPost("{publicId}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid publicId, [FromBody] ResetTimekeepingPasswordDto request)
        {
            await _userService.ResetPasswordAsync(publicId, request);
            _logger.LogInformation("Timekeeping user password reset: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("Password reset successfully"));
        }

        [HttpPatch("{publicId}/activate")]
        public async Task<IActionResult> Activate(Guid publicId)
        {
            await _userService.ActivateAsync(publicId);
            _logger.LogInformation("Timekeeping user activated: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("User activated successfully"));
        }

        [HttpPatch("{publicId}/deactivate")]
        public async Task<IActionResult> Deactivate(Guid publicId)
        {
            await _userService.DeactivateAsync(publicId);
            _logger.LogInformation("Timekeeping user deactivated: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("User deactivated successfully"));
        }

        [HttpDelete("{publicId}")]
        public async Task<IActionResult> Delete(Guid publicId)
        {
            await _userService.DeleteAsync(publicId);
            _logger.LogInformation("Timekeeping user deleted: {PublicId}", publicId);
            return Ok(ApiResponse.OkMessage("User deleted successfully"));
        }
    }
}
