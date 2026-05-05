using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Timekeeping;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/timekeeping/auth")]
    public class TimekeepingAuthController : ControllerBase
    {
        private readonly ITimekeepingAuthService _authService;
        private readonly ITimekeepingUserService _userService;
        private readonly IUnitOfWork _uow;
        private readonly ILogger<TimekeepingAuthController> _logger;

        public TimekeepingAuthController(
            ITimekeepingAuthService authService,
            ITimekeepingUserService userService,
            IUnitOfWork uow,
            ILogger<TimekeepingAuthController> logger)
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
            _logger.LogInformation("Timekeeping user logged in: {Email}", request.Email);
            return Ok(ApiResponse<TimekeepingLoginResponseDto>.Ok(result, "Login successful"));
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(ApiResponse<object>.Fail(400, "Refresh token is required"));

            var result = await _authService.RefreshTokenAsync(request);
            _logger.LogInformation("Timekeeping token refreshed successfully");
            return Ok(ApiResponse<TimekeepingLoginResponseDto>.Ok(result, "Token refreshed"));
        }

        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke([FromBody] RefreshTokenRequestDto request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(ApiResponse<object>.Fail(400, "Refresh token is required"));

            await _authService.RevokeTokenAsync(request.RefreshToken);
            _logger.LogInformation("Timekeeping token revoked successfully");
            return Ok(ApiResponse.OkMessage("Token revoked successfully"));
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(ApiResponse<object>.Fail(401, "Invalid token"));

            var tkUser = await _uow.TimekeepingUsers.GetByIdAsync(userId);
            if (tkUser == null)
                return Unauthorized(ApiResponse<object>.Fail(401, "User not found"));

            var result = await _userService.GetByPublicIdAsync(tkUser.PublicId);
            return Ok(ApiResponse<TimekeepingUserDto>.Ok(result));
        }
    }
}