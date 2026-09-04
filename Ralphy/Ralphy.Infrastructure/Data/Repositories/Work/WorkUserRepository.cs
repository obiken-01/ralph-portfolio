using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces.Repositories.Work;

namespace Ralphy.Infrastructure.Data.Repositories.Work
{
    public class WorkUserRepository : IWorkUserRepository
    {
        private readonly AppDbContext _context;

        public WorkUserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<WorkUser?> GetByIdAsync(int id)
            => await _context.WorkUsers.FirstOrDefaultAsync(u => u.Id == id);

        public async Task<WorkUser?> GetByPublicIdAsync(Guid publicId)
            => await _context.WorkUsers.FirstOrDefaultAsync(u => u.PublicId == publicId);

        public async Task<WorkUser?> GetByUsernameAsync(string username)
            => await _context.WorkUsers.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());

        public async Task<WorkUser?> GetByEmailAsync(string email)
            => await _context.WorkUsers.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

        public async Task<IEnumerable<WorkUser>> GetAllAsync()
            => await _context.WorkUsers
                .OrderBy(u => u.Username)
                .ToListAsync();

        public async Task AddAsync(WorkUser user)
            => await _context.WorkUsers.AddAsync(user);

        public void Update(WorkUser user)
            => _context.WorkUsers.Update(user);

        public void Delete(WorkUser user)
            => _context.WorkUsers.Remove(user);
    }
}
