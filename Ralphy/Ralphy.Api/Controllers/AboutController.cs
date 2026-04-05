using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.About;
using Ralphy.Application.Services.Interfaces;

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
        return Ok(ApiResponse<AboutProfileDto>.Ok(profile));
    }

    [HttpPut]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateAboutProfileDto dto)
    {
        await _aboutService.UpdateProfileAsync(dto);
        return Ok(ApiResponse.OkMessage("Profile updated"));
    }

    [HttpPost("experience")]
    [Authorize]
    public async Task<IActionResult> CreateWorkExperience([FromBody] CreateWorkExperienceDto dto)
    {
        var result = await _aboutService.CreateWorkExperienceAsync(dto);
        return Ok(ApiResponse<WorkExperienceDto>.Created(result));
    }

    [HttpPut("experience/{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateWorkExperience(int id, [FromBody] CreateWorkExperienceDto dto)
    {
        await _aboutService.UpdateWorkExperienceAsync(id, dto);
        return Ok(ApiResponse.OkMessage("Work experience updated"));
    }

    [HttpDelete("experience/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteWorkExperience(int id)
    {
        await _aboutService.DeleteWorkExperienceAsync(id);
        return Ok(ApiResponse.OkMessage("Work experience deleted"));
    }

    [HttpPost("skills")]
    [Authorize]
    public async Task<IActionResult> CreateSkill([FromBody] CreateSkillDto dto)
    {
        var result = await _aboutService.CreateSkillAsync(dto);
        return Ok(ApiResponse<SkillDto>.Created(result));
    }

    [HttpPut("skills/{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateSkill(int id, [FromBody] CreateSkillDto dto)
    {
        await _aboutService.UpdateSkillAsync(id, dto);
        return Ok(ApiResponse.OkMessage("Skill updated"));
    }

    [HttpDelete("skills/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        await _aboutService.DeleteSkillAsync(id);
        return Ok(ApiResponse.OkMessage("Skill deleted"));
    }

    [HttpPost("cv")]
    [Authorize]
    public async Task<IActionResult> UploadCv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse.OkMessage("No file provided."));

        if (!file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse.OkMessage("Only PDF files are allowed."));

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(ApiResponse.OkMessage("File size must be under 10MB."));

        await _aboutService.UploadCvAsync(file);
        return Ok(ApiResponse.OkMessage("CV uploaded"));
    }

    [HttpDelete("cv")]
    [Authorize]
    public async Task<IActionResult> DeleteCv()
    {
        await _aboutService.DeleteCvAsync();
        return Ok(ApiResponse.OkMessage("CV deleted"));
    }

    [HttpPost("profile-image")]
    [Authorize]
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse.OkMessage("No file provided."));

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(ApiResponse.OkMessage("File size must be under 10MB."));

        await _aboutService.UploadProfileImageAsync(file);
        return Ok(ApiResponse.OkMessage("Profile image uploaded"));
    }

    [HttpPost("cover-image")]
    [Authorize]
    public async Task<IActionResult> UploadCoverImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse.OkMessage("No file provided."));

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(ApiResponse.OkMessage("File size must be under 10MB."));

        await _aboutService.UploadCoverImageAsync(file);
        return Ok(ApiResponse.OkMessage("Cover image uploaded"));
    }
}