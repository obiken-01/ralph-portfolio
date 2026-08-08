using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IPhotoRepository : IBaseRepository<Photo>
    {
        Task<IEnumerable<Photo>> GetByPostIdAsync(int postId);

        /// <summary>Media uploaded before the app recorded dimensions.</summary>
        Task<IEnumerable<Photo>> GetMissingDimensionsAsync(int limit);

        Task<int> CountMissingDimensionsAsync();

        /// <summary>A random sample of images from published posts.</summary>
        Task<IEnumerable<Photo>> GetRandomPublishedAsync(int count);
    }
}
