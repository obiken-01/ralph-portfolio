using Ralphy.Application.DTOs.About;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class AboutService : IAboutService
    {
        private readonly IUnitOfWork _uow;

        public AboutService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<AboutProfileDto> GetProfileAsync()
        {
            var profile = await _uow.AboutProfiles.GetAsync();
            var workExperiences = await _uow.WorkExperiences.GetAllAsync();
            var skills = await _uow.Skills.GetAllAsync();

            if (profile == null)
                return new AboutProfileDto();

            return new AboutProfileDto
            {
                DisplayName = profile.DisplayName,
                Headline = profile.Headline,
                Bio = profile.Bio,
                ProfileImageUrl = profile.ProfileImageUrl,
                CoverImageUrl = profile.CoverImageUrl,
                CvUrl = profile.CvUrl,
                InstagramUrl = profile.InstagramUrl,
                LinkedInUrl = profile.LinkedInUrl,
                GitHubUrl = profile.GitHubUrl,
                YouTubeUrl = profile.YouTubeUrl,
                WorkExperiences = workExperiences.Select(MapWorkExperience).ToList(),
                Skills = skills.Select(MapSkill).ToList()
            };
        }

        public async Task UpdateProfileAsync(UpdateAboutProfileDto dto)
        {
            var profile = await _uow.AboutProfiles.GetAsync();

            if (profile == null)
            {
                await _uow.AboutProfiles.CreateAsync(new AboutProfile
                {
                    DisplayName = dto.DisplayName,
                    Headline = dto.Headline,
                    Bio = dto.Bio,
                    InstagramUrl = dto.InstagramUrl,
                    LinkedInUrl = dto.LinkedInUrl,
                    GitHubUrl = dto.GitHubUrl,
                    YouTubeUrl = dto.YouTubeUrl
                });
                return;
            }

            profile.DisplayName = dto.DisplayName;
            profile.Headline = dto.Headline;
            profile.Bio = dto.Bio;
            profile.InstagramUrl = dto.InstagramUrl;
            profile.LinkedInUrl = dto.LinkedInUrl;
            profile.GitHubUrl = dto.GitHubUrl;
            profile.YouTubeUrl = dto.YouTubeUrl;

            await _uow.AboutProfiles.UpdateAsync(profile);
        }

        public async Task<List<WorkExperienceDto>> GetWorkExperiencesAsync()
        {
            var list = await _uow.WorkExperiences.GetAllAsync();
            return list.Select(MapWorkExperience).ToList();
        }

        public async Task<WorkExperienceDto> CreateWorkExperienceAsync(CreateWorkExperienceDto dto)
        {
            var entity = new WorkExperience
            {
                Role = dto.Role,
                Company = dto.Company,
                Period = dto.Period,
                Description = dto.Description,
                Tags = string.Join(",", dto.Tags),
                DisplayOrder = dto.DisplayOrder
            };

            var created = await _uow.WorkExperiences.CreateAsync(entity);
            return MapWorkExperience(created);
        }

        public async Task UpdateWorkExperienceAsync(int id, CreateWorkExperienceDto dto)
        {
            var entity = await _uow.WorkExperiences.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"WorkExperience {id} not found");

            entity.Role = dto.Role;
            entity.Company = dto.Company;
            entity.Period = dto.Period;
            entity.Description = dto.Description;
            entity.Tags = string.Join(",", dto.Tags);
            entity.DisplayOrder = dto.DisplayOrder;

            await _uow.WorkExperiences.UpdateAsync(entity);
        }

        public async Task DeleteWorkExperienceAsync(int id)
        {
            var entity = await _uow.WorkExperiences.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"WorkExperience {id} not found");

            await _uow.WorkExperiences.DeleteAsync(entity);
        }

        public async Task<List<SkillDto>> GetSkillsAsync()
        {
            var list = await _uow.Skills.GetAllAsync();
            return list.Select(MapSkill).ToList();
        }

        public async Task<SkillDto> CreateSkillAsync(CreateSkillDto dto)
        {
            var entity = new Skill
            {
                Name = dto.Name,
                Percentage = dto.Percentage,
                Category = dto.Category,
                DisplayOrder = dto.DisplayOrder
            };

            var created = await _uow.Skills.CreateAsync(entity);
            return MapSkill(created);
        }

        public async Task UpdateSkillAsync(int id, CreateSkillDto dto)
        {
            var entity = await _uow.Skills.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Skill {id} not found");

            entity.Name = dto.Name;
            entity.Percentage = dto.Percentage;
            entity.Category = dto.Category;
            entity.DisplayOrder = dto.DisplayOrder;

            await _uow.Skills.UpdateAsync(entity);
        }

        public async Task DeleteSkillAsync(int id)
        {
            var entity = await _uow.Skills.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Skill {id} not found");

            await _uow.Skills.DeleteAsync(entity);
        }

        private static WorkExperienceDto MapWorkExperience(WorkExperience w) => new()
        {
            Id = w.Id,
            Role = w.Role,
            Company = w.Company,
            Period = w.Period,
            Description = w.Description,
            Tags = string.IsNullOrEmpty(w.Tags)
                ? new List<string>()
                : w.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            DisplayOrder = w.DisplayOrder
        };

        private static SkillDto MapSkill(Skill s) => new()
        {
            Id = s.Id,
            Name = s.Name,
            Percentage = s.Percentage,
            Category = s.Category.ToString(),
            DisplayOrder = s.DisplayOrder
        };
    }
}