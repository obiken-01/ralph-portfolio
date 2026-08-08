using AutoMapper;
using Ralphy.Application.DTOs.Comments;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class CommentService : ICommentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public CommentService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<CommentDto>> GetByPostIdAsync(int postId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            var comments = await _unitOfWork.Comments.GetByPostIdAsync(postId);
            return _mapper.Map<IEnumerable<CommentDto>>(comments);
        }

        public async Task<CommentDto> CreateAsync(int postId, CreateCommentDto request)
        {
            // Verify post exists and is published
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            if (post.Status != Domain.Enums.PostStatus.Published)
                throw new InvalidOperationException(
                    "Comments can only be added to published posts");

            var comment = _mapper.Map<Comment>(request);
            comment.PostId = postId;

            await _unitOfWork.Comments.AddAsync(comment);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<CommentDto>(comment);
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var comment = await _unitOfWork.Comments.GetByIdAsync(id);
            if (comment == null)
                throw new KeyNotFoundException($"Comment with ID {id} not found");

            // Comments are moderated by whoever owns the post they sit on.
            var post = await _unitOfWork.Posts.GetByIdAsync(comment.PostId);
            if (post == null)
                throw new KeyNotFoundException("Associated post not found");

            if (post.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to delete this comment");

            await _unitOfWork.Comments.DeleteAsync(comment);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}