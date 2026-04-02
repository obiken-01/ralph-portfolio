using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class ContactMessageRepository : IContactMessageRepository
    {
        private readonly AppDbContext _context;

        public ContactMessageRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ContactMessage>> GetAllAsync()
            => await _context.ContactMessages
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

        public async Task<ContactMessage?> GetByIdAsync(int id)
            => await _context.ContactMessages.FindAsync(id);

        public async Task<int> GetUnreadCountAsync()
            => await _context.ContactMessages.CountAsync(m => !m.IsRead);

        public async Task<ContactMessage> CreateAsync(ContactMessage message)
        {
            _context.ContactMessages.Add(message);
            await _context.SaveChangesAsync();
            return message;
        }

        public async Task UpdateAsync(ContactMessage message)
        {
            _context.ContactMessages.Update(message);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(ContactMessage message)
        {
            _context.ContactMessages.Remove(message);
            await _context.SaveChangesAsync();
        }
    }
}
