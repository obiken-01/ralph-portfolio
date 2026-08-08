using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        /// <summary>Public map feed — placeholder and post-less places excluded.</summary>
        [HttpGet]
        public async Task<IActionResult> GetPublic()
        {
            var locations = await _locationService.GetPublicAsync();
            return Ok(ApiResponse<IEnumerable<LocationDto>>.Ok(locations));
        }

        /// <summary>Every place, for the admin picker.</summary>
        [Authorize]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var locations = await _locationService.GetAllAsync();
            return Ok(ApiResponse<IEnumerable<LocationDto>>.Ok(locations));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var location = await _locationService.GetByIdAsync(id);
            return Ok(ApiResponse<LocationDto>.Ok(location));
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateLocationDto request)
        {
            var validation = await _validator.ValidateAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<object>.Fail(400, "Validation failed",
                    validation.Errors.Select(e => e.ErrorMessage)));

            var location = await _locationService.CreateAsync(request);
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

            var location = await _locationService.UpdateAsync(id, request);
            _logger.LogInformation("Location updated: {Id}", id);
            return Ok(ApiResponse<LocationDto>.Ok(location, "Location updated successfully"));
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _locationService.DeleteAsync(id);
            _logger.LogInformation("Location deleted: {Id}", id);
            return Ok(ApiResponse.OkMessage("Location deleted successfully"));
        }
    }
}
