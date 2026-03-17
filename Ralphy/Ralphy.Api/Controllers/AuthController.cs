using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IValidator<RegisterRequestDto> _registerValidator;
        private readonly IValidator<LoginRequestDto> _loginValidator;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IValidator<RegisterRequestDto> registerValidator,
            IValidator<LoginRequestDto> loginValidator,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _registerValidator = registerValidator;
            _loginValidator = loginValidator;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            var validation = await _registerValidator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var result = await _authService.RegisterAsync(request);
            _logger.LogInformation("User registered: {Email}", request.Email);
            return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Registration successful"));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var validation = await _loginValidator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var result = await _authService.LoginAsync(request);
            _logger.LogInformation("User logged in: {Email}", request.Email);
            return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Login successful"));
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(ApiResponse<object>.Fail(400, "Refresh token is required"));

            var result = await _authService.RefreshTokenAsync(request);
            _logger.LogInformation("Token refreshed successfully");
            return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Token refreshed"));
        }

        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke([FromBody] RefreshTokenRequestDto request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(ApiResponse<object>.Fail(400, "Refresh token is required"));

            await _authService.RevokeTokenAsync(request.RefreshToken);
            _logger.LogInformation("Token revoked successfully");
            return Ok(ApiResponse.OkMessage("Token revoked successfully"));
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                ?? User.FindFirst("email")?.Value;
            var username = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("unique_name")?.Value;

            var data = new { UserId = userId, Email = email, Username = username };
            return Ok(ApiResponse<object>.Ok(data));
        }
    }
}
