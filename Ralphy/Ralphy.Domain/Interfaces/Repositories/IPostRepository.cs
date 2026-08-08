using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IPostRepository : IBaseRepository<Post>
    {
        Task<IEnumerable<Post>> GetAllPublishedAsync();
        Task<Post?> GetPostWithDetailsAsync(int id);
        Task<IEnumerable<Post>> GetByTagAsync(string tagName);
        Task<IEnumerable<Post>> GetByLocationIdAsync(int locationId);
        Task IncrementViewCountAsync(int postId);
        Task RecalculateTakenAtAsync(int postId);
    }
}
