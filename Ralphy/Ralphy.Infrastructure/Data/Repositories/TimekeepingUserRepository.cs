using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class TimekeepingUserRepository : ITimekeepingUserRepository
    {
        private readonly AppDbContext _context;

        public TimekeepingUserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TimekeepingUser?> GetByIdAsync(int id)
            => await _context.TimekeepingUsers.FirstOrDefaultAsync(u => u.Id == id);

        public async Task<TimekeepingUser?> GetByPublicIdAsync(Guid publicId)
            => await _context.TimekeepingUsers.FirstOrDefaultAsync(u => u.PublicId == publicId);

        public async Task<TimekeepingUser?> GetByUsernameAsync(string username)
            => await _context.TimekeepingUsers.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());

        public async Task<TimekeepingUser?> GetByEmailAsync(string email)
            => await _context.TimekeepingUsers.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

        public async Task<IEnumerable<TimekeepingUser>> GetAllAsync()
            => await _context.TimekeepingUsers
                .OrderBy(u => u.Username)
                .ToListAsync();

        public async Task AddAsync(TimekeepingUser user)
            => await _context.TimekeepingUsers.AddAsync(user);

        public void Update(TimekeepingUser user)
            => _context.TimekeepingUsers.Update(user);

        public void Delete(TimekeepingUser user)
            => _context.TimekeepingUsers.Remove(user);
    }
}