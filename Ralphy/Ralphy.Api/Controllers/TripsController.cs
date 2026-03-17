using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Helpers;
using Ralphy.Application.DTOs.Trips;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        private readonly ITripService _tripService;
        private readonly ILogger<TripsController> _logger;

        public TripsController(
            ITripService tripService,
            ILogger<TripsController> logger)
        {
            _tripService = tripService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPublished()
        {
            var trips = await _tripService.GetAllPublishedAsync();
            return Ok(trips);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var trip = await _tripService.GetByIdAsync(id);
            return Ok(trip);
        }

        [HttpGet("{id}/posts")]
        public async Task<IActionResult> GetTripWithPosts(int id)
        {
            var trip = await _tripService.GetTripWithPostsAsync(id);
            return Ok(trip);
        }

        [Authorize]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var trips = await _tripService.GetAllAsync();
            return Ok(trips);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTripDto request)
        {
            var userId = ClaimsHelper.GetUserId(User);
            var trip = await _tripService.CreateAsync(request, userId);
            _logger.LogInformation("Trip created: {Title}", request.Title);
            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTripDto request)
        {
            var userId = ClaimsHelper.GetUserId(User);
            var trip = await _tripService.UpdateAsync(id, request, userId);
            _logger.LogInformation("Trip updated: {Id}", id);
            return Ok(trip);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _tripService.DeleteAsync(id, userId);
            _logger.LogInformation("Trip deleted: {Id}", id);
            return Ok(new { StatusCode = 200, Message = "Trip deleted successfully" });
        }

        [Authorize]
        [HttpPut("{id}/publish")]
        public async Task<IActionResult> Publish(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _tripService.PublishAsync(id, userId);
            _logger.LogInformation("Trip published: {Id}", id);
            return Ok(new { StatusCode = 200, Message = "Trip published successfully" });
        }

        [Authorize]
        [HttpPut("{id}/unpublish")]
        public async Task<IActionResult> Unpublish(int id)
        {
            var userId = ClaimsHelper.GetUserId(User);
            await _tripService.UnpublishAsync(id, userId);
            _logger.LogInformation("Trip unpublished: {Id}", id);
            return Ok(new { StatusCode = 200, Message = "Trip unpublished successfully" });
        }
    }
}