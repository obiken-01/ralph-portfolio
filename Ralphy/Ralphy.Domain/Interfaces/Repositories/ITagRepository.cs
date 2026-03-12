using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ITagRepository : IBaseRepository<Tag>
    {
        Task<Tag?> GetByNameAsync(string name);

        Task<IEnumerable<Tag>> GetAllAsync();

        Task<bool> ExistsAsync(string name);
    }
}