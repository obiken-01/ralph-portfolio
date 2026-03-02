using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IPhotoRepository : IBaseRepository<Photo>
    {
        Task<IEnumerable<Photo>> GetByPostIdAsync(int postId);
    }
}