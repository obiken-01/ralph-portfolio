using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ISkillRepository
    {
        Task<List<Skill>> GetAllAsync();

        Task<Skill?> GetByIdAsync(int id);

        Task<Skill> CreateAsync(Skill skill);

        Task UpdateAsync(Skill skill);

        Task DeleteAsync(Skill skill);
    }
}