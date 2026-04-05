using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IAboutProfileRepository
    {
        Task<AboutProfile?> GetAsync();

        Task<AboutProfile> CreateAsync(AboutProfile profile);

        Task UpdateAsync(AboutProfile profile);
    }
}