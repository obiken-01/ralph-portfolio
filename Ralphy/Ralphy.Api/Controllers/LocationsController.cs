using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.DTOs.Locations;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationsController : ControllerBase
    {
        private readonly ILocationService _locationService;
        private readonly IValidator<CreateLocationDto> _validator;
        private readonly ILogger<LocationsController> _logger;

        public LocationsController(
            ILocationService locationService,
            IValidator<CreateLocationDto> validator,
            ILogger<LocationsController> logger)
        {
            _locationService = locationService;
            _validator = validator;
            _logger = logger;
        }

        // Public endpoints
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var locations = await _locationService.GetAllAsync();
            return Ok(locations);
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetByTripId(int tripId)
        {
            try
            {
                var locations = await _locationService.GetByTripIdAsync(tripId);
                return Ok(locations);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
        }

        // Admin endpoints
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateLocationDto request)
        {
            var validationResult = await _validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Validation failed",
                    Errors = validationResult.Errors.Select(e => e.ErrorMessage)
                });
            }

            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                var location = await _locationService.CreateAsync(request, userId);
                _logger.LogInformation("Location created: {PlaceName}", request.PlaceName);
                return Ok(location);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { StatusCode = 401, Message = ex.Message });
            }
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id, [FromBody] CreateLocationDto request)
        {
            var validationResult = await _validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Validation failed",
                    Errors = validationResult.Errors.Select(e => e.ErrorMessage)
                });
            }

            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                var location = await _locationService.UpdateAsync(id, request, userId);
                _logger.LogInformation("Location updated: {Id}", id);
                return Ok(location);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { StatusCode = 401, Message = ex.Message });
            }
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = ClaimsHelper.GetUserId(User);
                await _locationService.DeleteAsync(id, userId);
                _logger.LogInformation("Location deleted: {Id}", id);
                return Ok(new
                {
                    StatusCode = 200,
                    Message = "Location deleted successfully"
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { StatusCode = 404, Message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { StatusCode = 401, Message = ex.Message });
            }
        }
    }
}