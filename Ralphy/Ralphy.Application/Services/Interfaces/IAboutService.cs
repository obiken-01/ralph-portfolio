using Ralphy.Application.DTOs.About;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IAboutService
    {
        Task<AboutProfileDto> GetProfileAsync();

        Task UpdateProfileAsync(UpdateAboutProfileDto dto);

        Task<List<WorkExperienceDto>> GetWorkExperiencesAsync();

        Task<WorkExperienceDto> CreateWorkExperienceAsync(CreateWorkExperienceDto dto);

        Task UpdateWorkExperienceAsync(int id, CreateWorkExperienceDto dto);

        Task DeleteWorkExperienceAsync(int id);

        Task<List<SkillDto>> GetSkillsAsync();

        Task<SkillDto> CreateSkillAsync(CreateSkillDto dto);

        Task UpdateSkillAsync(int id, CreateSkillDto dto);

        Task DeleteSkillAsync(int id);
    }
}