using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ITagRepository : IBaseRepository<Tag>
    {
        Task<Tag?> GetByNameAsync(string name);

        /// <summary>Tags with at least one published post.</summary>
        Task<IEnumerable<Tag>> GetPublishedAsync();

        Task<bool> ExistsAsync(string name);
    }
}
