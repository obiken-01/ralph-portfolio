using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class PostTagRepository : IPostTagRepository
    {
        private readonly AppDbContext _context;

        public PostTagRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(PostTag postTag) =>
            await _context.PostTags.AddAsync(postTag);

        public Task RemoveAsync(PostTag postTag)
        {
            _context.PostTags.Remove(postTag);
            return Task.CompletedTask;
        }

        public async Task<IEnumerable<PostTag>> GetByPostIdAsync(int postId) =>
            await _context.PostTags
                .Include(pt => pt.Tag)
                .Where(pt => pt.PostId == postId)
                .ToListAsync();

        public async Task RemoveAllByPostIdAsync(int postId)
        {
            var postTags = await GetByPostIdAsync(postId);
            _context.PostTags.RemoveRange(postTags);
        }
    }
}