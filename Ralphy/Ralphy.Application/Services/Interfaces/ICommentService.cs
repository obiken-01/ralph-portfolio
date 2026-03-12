using Ralphy.Application.DTOs.Comments;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ICommentService
    {
        Task<IEnumerable<CommentDto>> GetByPostIdAsync(int postId);

        Task<CommentDto> CreateAsync(int postId, CreateCommentDto request);

        Task DeleteAsync(int id, int userId);
    }
}