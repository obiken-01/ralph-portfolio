using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class TagRepository : BaseRepository<Tag>, ITagRepository
    {
        public TagRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Tag?> GetByNameAsync(string name) =>
            await _dbSet.FirstOrDefaultAsync(t =>
                t.Name.ToLower() == name.ToLower());

        public async Task<IEnumerable<Tag>> GetAllAsync() =>
            await _dbSet
                .OrderBy(t => t.Name)
                .ToListAsync();

        public async Task<bool> ExistsAsync(string name) =>
            await _dbSet.AnyAsync(t =>
                t.Name.ToLower() == name.ToLower());
    }
}