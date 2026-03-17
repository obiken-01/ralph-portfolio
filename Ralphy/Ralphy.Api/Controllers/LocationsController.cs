using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.Common;
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

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var locations = await _locationService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<LocationDto>>.Ok(locations));
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetByTripId(int tripId)
        {
            var locations = await _locationService.GetByTripIdAsync(tripId);
            return Ok(ApiResponse<IEnumerable<LocationDto>>.Ok(locations));
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateLocationDto request)
        {
            var validation = await _validator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var userId = ClaimsHelper.GetUserId(User);
            var location = await _locationService.CreateAsync(request, userId);
            _logger.LogInformation("Location created: {PlaceName}", request.PlaceName);
            return Ok(ApiResponse<LocationDto>.Ok(location, "Location created successfully"));
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateLocationDto request)
        {
            var validation = await _validator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var userId = ClaimsHelper.GetUserId(User);
            var location = await _locationService.UpdateAsync(id, request, userId);
            _logger.LogInformation("Location updated: {Id}", id);
            return Ok(ApiResponse<LocationDto>.Ok(location, "Location updated successfully"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _locationService.DeleteAsync(id, userId);
            _logger.LogInformation("Location deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Location deleted successfully"));
        }
    }
}