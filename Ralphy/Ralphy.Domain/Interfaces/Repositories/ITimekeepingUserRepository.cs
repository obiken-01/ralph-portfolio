using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface ITimekeepingUserRepository
    {
        Task<TimekeepingUser?> GetByIdAsync(int id);

        Task<TimekeepingUser?> GetByPublicIdAsync(Guid publicId);

        Task<TimekeepingUser?> GetByUsernameAsync(string username);

        Task<TimekeepingUser?> GetByEmailAsync(string email);

        Task<IEnumerable<TimekeepingUser>> GetAllAsync();

        Task AddAsync(TimekeepingUser user);

        void Update(TimekeepingUser user);

        void Delete(TimekeepingUser user);
    }
}