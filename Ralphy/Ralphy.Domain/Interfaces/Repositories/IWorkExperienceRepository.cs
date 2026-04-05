using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IWorkExperienceRepository
    {
        Task<List<WorkExperience>> GetAllAsync();

        Task<WorkExperience?> GetByIdAsync(int id);

        Task<WorkExperience> CreateAsync(WorkExperience workExperience);

        Task UpdateAsync(WorkExperience workExperience);

        Task DeleteAsync(WorkExperience workExperience);
    }
}