using Ralphy.Application.DTOs.Contact;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class ContactService : IContactService
    {
        private readonly IUnitOfWork _uow;

        public ContactService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<List<ContactMessageDto>> GetAllMessagesAsync()
        {
            var list = await _uow.ContactMessages.GetAllAsync();
            return list.Select(MapMessage).ToList();
        }

        public async Task<int> GetUnreadCountAsync()
            => await _uow.ContactMessages.GetUnreadCountAsync();

        public async Task<ContactMessageDto> CreateMessageAsync(CreateContactMessageDto dto)
        {
            var entity = new ContactMessage
            {
                AuthorName = dto.AuthorName,
                AuthorEmail = dto.AuthorEmail,
                Subject = dto.Subject,
                Message = dto.Message
            };

            var created = await _uow.ContactMessages.CreateAsync(entity);
            return MapMessage(created);
        }

        public async Task MarkAsReadAsync(int id)
        {
            var entity = await _uow.ContactMessages.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"ContactMessage {id} not found");

            entity.IsRead = true;
            await _uow.ContactMessages.UpdateAsync(entity);
        }

        public async Task DeleteMessageAsync(int id)
        {
            var entity = await _uow.ContactMessages.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"ContactMessage {id} not found");

            await _uow.ContactMessages.DeleteAsync(entity);
        }

        private static ContactMessageDto MapMessage(ContactMessage m) => new()
        {
            Id = m.Id,
            AuthorName = m.AuthorName,
            AuthorEmail = m.AuthorEmail,
            Subject = m.Subject,
            Message = m.Message,
            IsRead = m.IsRead,
            CreatedAt = m.CreatedAt
        };
    }
}