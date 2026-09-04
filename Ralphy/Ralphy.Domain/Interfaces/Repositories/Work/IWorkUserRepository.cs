using Ralphy.Domain.Entities.Work;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    public interface IWorkUserRepository
    {
        Task<WorkUser?> GetByIdAsync(int id);

        Task<WorkUser?> GetByPublicIdAsync(Guid publicId);

        Task<WorkUser?> GetByUsernameAsync(string username);

        Task<WorkUser?> GetByEmailAsync(string email);

        Task<IEnumerable<WorkUser>> GetAllAsync();

        Task AddAsync(WorkUser user);

        void Update(WorkUser user);

        void Delete(WorkUser user);
    }
}
