using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.DTOs.About;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/about")]
    public class AboutController : ControllerBase
    {
        private readonly IAboutService _aboutService;

        public AboutController(IAboutService aboutService)
        {
            _aboutService = aboutService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var profile = await _aboutService.GetProfileAsync();
            return Ok(profile);
        }

        [HttpPut]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateAboutProfileDto dto)
        {
            await _aboutService.UpdateProfileAsync(dto);
            return NoContent();
        }

        [HttpPost("experience")]
        [Authorize]
        public async Task<IActionResult> CreateWorkExperience([FromBody] CreateWorkExperienceDto dto)
        {
            var result = await _aboutService.CreateWorkExperienceAsync(dto);
            return CreatedAtAction(nameof(GetProfile), result);
        }

        [HttpPut("experience/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateWorkExperience(int id, [FromBody] CreateWorkExperienceDto dto)
        {
            await _aboutService.UpdateWorkExperienceAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("experience/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteWorkExperience(int id)
        {
            await _aboutService.DeleteWorkExperienceAsync(id);
            return NoContent();
        }

        [HttpPost("skills")]
        [Authorize]
        public async Task<IActionResult> CreateSkill([FromBody] CreateSkillDto dto)
        {
            var result = await _aboutService.CreateSkillAsync(dto);
            return CreatedAtAction(nameof(GetProfile), result);
        }

        [HttpPut("skills/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateSkill(int id, [FromBody] CreateSkillDto dto)
        {
            await _aboutService.UpdateSkillAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("skills/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSkill(int id)
        {
            await _aboutService.DeleteSkillAsync(id);
            return NoContent();
        }
    }
}