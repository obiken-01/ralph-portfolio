using Ralphy.Application.DTOs.Contact;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IContactService
    {
        Task<List<ContactMessageDto>> GetAllMessagesAsync();

        Task<int> GetUnreadCountAsync();

        Task<ContactMessageDto> CreateMessageAsync(CreateContactMessageDto dto);

        Task MarkAsReadAsync(int id);

        Task DeleteMessageAsync(int id);
    }
}