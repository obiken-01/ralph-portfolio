using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IPostTagRepository
    {
        Task AddAsync(PostTag postTag);

        Task RemoveAsync(PostTag postTag);

        Task<IEnumerable<PostTag>> GetByPostIdAsync(int postId);

        Task RemoveAllByPostIdAsync(int postId);
    }
}