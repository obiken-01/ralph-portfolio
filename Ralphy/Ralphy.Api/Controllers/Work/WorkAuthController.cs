using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Api.Controllers.Work
{
    [ApiController]
    [Route("api/work/auth")]
    // DEPRECATED alias — the tools site calls this until the Netlify cutover.
    // Remove in the follow-up commit once WM-B07 verifies the new prefix.
    [Route("api/timekeeping/auth")]
    public class WorkAuthController : ControllerBase
    {
        private readonly IWorkAuthService _authService;
        private readonly IWorkUserService _userService;
        private readonly IUnitOfWork _uow;
        private readonly ILogger<WorkAuthController> _logger;

        public WorkAuthController(
            IWorkAuthService authService,
            IWorkUserService userService,
            IUnitOfWork uow,
            ILogger<WorkAuthController> logger)
        {
            _authService = authService;
            _userService = userService;
            _uow = uow;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                return BadRequest(ApiResponse<object>.Fail(400, "Email and password are required"));

            var result = await _authService.LoginAsync(request);
            _logger.LogInformation("Work user logged in: {Email}", request.Email);
            return Ok(ApiResponse<WorkLoginResponseDto>.Ok(result, "Login successful"));
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(ApiResponse<object>.Fail(400, "Refresh token is required"));

            var result = await _authService.RefreshTokenAsync(request);
            _logger.LogInformation("Work token refreshed successfully");
            return Ok(ApiResponse<WorkLoginResponseDto>.Ok(result, "Token refreshed"));
        }

        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke([FromBody] RefreshTokenRequestDto request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(ApiResponse<object>.Fail(400, "Refresh token is required"));

            await _authService.RevokeTokenAsync(request.RefreshToken);
            _logger.LogInformation("Work token revoked successfully");
            return Ok(ApiResponse.OkMessage("Token revoked successfully"));
        }

        [Authorize(Policy = "WorkUser")]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var workUser = await _uow.WorkUsers.GetByIdAsync(User.GetWorkUserId());
            if (workUser == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "User not found"));

            var result = await _userService.GetByPublicIdAsync(workUser.PublicId);
            return Ok(ApiResponse<WorkUserDto>.Ok(result));
        }
    }
}