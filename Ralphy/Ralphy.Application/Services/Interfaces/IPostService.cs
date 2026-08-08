using Ralphy.Application.DTOs.Posts;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IPostService
    {
        Task<IEnumerable<PostDto>> GetAllPublishedAsync();

        Task<IEnumerable<PostDto>> GetAllAsync();

        Task<PostDto?> GetByIdAsync(int id);

        Task<PostWithDetailsDto?> GetPostWithDetailsAsync(int id);

        Task<IEnumerable<PostDto>> GetByTagAsync(string tagName);

        Task<IEnumerable<PostDto>> GetByLocationIdAsync(int locationId);

        Task<IEnumerable<PostDto>> GetByTripIdAsync(int tripId);

        Task<PostDto> CreateAsync(CreatePostDto request, int userId);

        Task<PostDto> UpdateAsync(int id, UpdatePostDto request, int userId);

        Task DeleteAsync(int id, int userId);

        Task PublishAsync(int id, int userId);

        Task UnpublishAsync(int id, int userId);

        Task IncrementViewCountAsync(int id);
    }
}
