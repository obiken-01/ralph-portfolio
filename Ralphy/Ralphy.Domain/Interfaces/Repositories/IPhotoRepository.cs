using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IPhotoRepository : IBaseRepository<Photo>
    {
        Task<IEnumerable<Photo>> GetByPostIdAsync(int postId);

        /// <summary>A random sample of images from published posts.</summary>
        Task<IEnumerable<Photo>> GetRandomPublishedAsync(int count);
    }
}
