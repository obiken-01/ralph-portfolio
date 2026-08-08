using AutoMapper;
using Ralphy.Application.DTOs.Tags;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class TagService : ITagService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TagService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        /// <summary>
        /// Every tag, including ones with no published posts — the admin tag
        /// picker still wants to offer those while drafting.
        /// </summary>
        public async Task<IEnumerable<TagDto>> GetAllAsync()
        {
            var tags = await _unitOfWork.Tags.GetAllAsync();
            return _mapper.Map<IEnumerable<TagDto>>(tags);
        }

        /// <summary>
        /// Tags with at least one published post, most-used first. A chip with
        /// nothing behind it is a dead link.
        /// </summary>
        public async Task<IEnumerable<TagDto>> GetPublishedAsync()
        {
            var tags = await _unitOfWork.Tags.GetPublishedAsync();
            return _mapper.Map<IEnumerable<TagDto>>(tags)
                .OrderByDescending(t => t.PostCount)
                .ThenBy(t => t.Name)
                .ToList();
        }

        public async Task<TagDto> CreateAsync(CreateTagDto request)
        {
            // Check if tag already exists
            if (await _unitOfWork.Tags.ExistsAsync(request.Name))
                throw new InvalidOperationException(
                    $"Tag '{request.Name}' already exists");

            var tag = new Tag
            {
                Name = request.Name.ToLower().Trim()
            };

            await _unitOfWork.Tags.AddAsync(tag);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<TagDto>(tag);
        }

        public async Task AssignTagsToPostAsync(
            int postId, AssignTagDto request, int userId)
        {
            // Verify post exists
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            if (post.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to assign tags to this post");

            // Remove existing tags
            await _unitOfWork.PostTags.RemoveAllByPostIdAsync(postId);

            // Add new tags
            foreach (var tagName in request.Tags)
            {
                // Get or create tag
                var tag = await _unitOfWork.Tags.GetByNameAsync(tagName);
                if (tag == null)
                {
                    tag = new Tag { Name = tagName.ToLower().Trim() };
                    await _unitOfWork.Tags.AddAsync(tag);
                    await _unitOfWork.SaveChangesAsync();
                }

                // Assign tag to post
                var postTag = new PostTag
                {
                    PostId = postId,
                    TagId = tag.Id
                };

                await _unitOfWork.PostTags.AddAsync(postTag);
            }

            await _unitOfWork.SaveChangesAsync();
        }

        public async Task RemoveTagsFromPostAsync(int postId, int userId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            if (post.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to remove tags from this post");

            await _unitOfWork.PostTags.RemoveAllByPostIdAsync(postId);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var tag = await _unitOfWork.Tags.GetByIdAsync(id);
            if (tag == null)
                throw new KeyNotFoundException($"Tag with ID {id} not found");

            await _unitOfWork.Tags.DeleteAsync(tag);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}