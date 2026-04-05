using Ralphy.Domain.Entities;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IContactMessageRepository
    {
        Task<List<ContactMessage>> GetAllAsync();

        Task<ContactMessage?> GetByIdAsync(int id);

        Task<int> GetUnreadCountAsync();

        Task<ContactMessage> CreateAsync(ContactMessage message);

        Task UpdateAsync(ContactMessage message);

        Task DeleteAsync(ContactMessage message);
    }
}