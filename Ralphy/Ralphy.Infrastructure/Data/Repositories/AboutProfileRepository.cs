using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class AboutProfileRepository : IAboutProfileRepository
    {
        private readonly AppDbContext _context;

        public AboutProfileRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AboutProfile?> GetAsync()
            => await _context.AboutProfiles.FirstOrDefaultAsync();

        public async Task<AboutProfile> CreateAsync(AboutProfile profile)
        {
            _context.AboutProfiles.Add(profile);
            await _context.SaveChangesAsync();
            return profile;
        }

        public async Task UpdateAsync(AboutProfile profile)
        {
            _context.AboutProfiles.Update(profile);
            await _context.SaveChangesAsync();
        }
    }
}