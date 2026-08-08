using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class TagRepository : BaseRepository<Tag>, ITagRepository
    {
        public TagRepository(AppDbContext context) : base(context)
        {
        }

        // Names are lowercased on write, so normalize the needle rather than
        // lowering the column — that keeps the unique index usable.
        public async Task<Tag?> GetByNameAsync(string name)
        {
            var normalized = name.ToLower().Trim();
            return await _dbSet.FirstOrDefaultAsync(t => t.Name == normalized);
        }

        public override async Task<IEnumerable<Tag>> GetAllAsync() =>
            await _dbSet
                .Include(t => t.PostTags)
                    .ThenInclude(pt => pt.Post)
                .OrderBy(t => t.Name)
                .ToListAsync();

        /// <summary>
        /// Tags with at least one published post. A chip for a tag with nothing
        /// behind it is a dead link, so the public list leaves them out.
        /// </summary>
        public async Task<IEnumerable<Tag>> GetPublishedAsync() =>
            await _dbSet
                .Include(t => t.PostTags)
                    .ThenInclude(pt => pt.Post)
                .Where(t => t.PostTags.Any(pt =>
                    pt.Post.Status == PostStatus.Published))
                .OrderBy(t => t.Name)
                .ToListAsync();

        public async Task<bool> ExistsAsync(string name)
        {
            var normalized = name.ToLower().Trim();
            return await _dbSet.AnyAsync(t => t.Name == normalized);
        }
    }
}
