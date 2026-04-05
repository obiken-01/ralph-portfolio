using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Infrastructure.Data.Repositories
{
    public class WorkExperienceRepository : IWorkExperienceRepository
    {
        private readonly AppDbContext _context;

        public WorkExperienceRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<WorkExperience>> GetAllAsync()
            => await _context.WorkExperiences
                .OrderBy(w => w.DisplayOrder)
                .ToListAsync();

        public async Task<WorkExperience?> GetByIdAsync(int id)
            => await _context.WorkExperiences.FindAsync(id);

        public async Task<WorkExperience> CreateAsync(WorkExperience workExperience)
        {
            _context.WorkExperiences.Add(workExperience);
            await _context.SaveChangesAsync();
            return workExperience;
        }

        public async Task UpdateAsync(WorkExperience workExperience)
        {
            _context.WorkExperiences.Update(workExperience);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(WorkExperience workExperience)
        {
            _context.WorkExperiences.Remove(workExperience);
            await _context.SaveChangesAsync();
        }
    }
}