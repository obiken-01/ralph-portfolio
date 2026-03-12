using Ralphy.Application.DTOs.Tags;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ITagService
    {
        Task<IEnumerable<TagDto>> GetAllAsync();

        Task<TagDto> CreateAsync(CreateTagDto request);

        Task AssignTagsToPostAsync(int postId, AssignTagDto request, int userId);

        Task RemoveTagsFromPostAsync(int postId, int userId);

        Task DeleteAsync(int id);
    }
}