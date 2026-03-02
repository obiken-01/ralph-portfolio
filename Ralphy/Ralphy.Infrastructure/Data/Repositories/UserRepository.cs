using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class UserRepository : BaseRepository<User>, IUserRepository
    {
        public UserRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByEmailAsync(string email) =>
            await _dbSet.FirstOrDefaultAsync(u => u.Email == email);

        public async Task<User?> GetByUsernameAsync(string username) =>
            await _dbSet.FirstOrDefaultAsync(u => u.Username == username);

        public async Task<bool> EmailExistsAsync(string email) =>
            await _dbSet.AnyAsync(u => u.Email == email);

        public async Task<bool> UsernameExistsAsync(string username) =>
            await _dbSet.AnyAsync(u => u.Username == username);
    }
}