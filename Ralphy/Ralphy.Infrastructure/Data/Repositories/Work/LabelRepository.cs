using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces.Repositories.Work;

namespace Ralphy.Infrastructure.Data.Repositories.Work
{
    /// <summary>
    /// Labels are workspace-wide, so there is no visibility predicate here — the
    /// absence is deliberate, not an oversight.
    /// </summary>
    public class LabelRepository : ILabelRepository
    {
        private readonly AppDbContext _db;

        public LabelRepository(AppDbContext db) => _db = db;

        public async Task<IReadOnlyList<Label>> GetAllAsync(CancellationToken ct = default)
            => await _db.Labels.OrderBy(l => l.Name).ToListAsync(ct);

        public Task<Label?> GetByIdAsync(int id, CancellationToken ct = default)
            => _db.Labels.FirstOrDefaultAsync(l => l.Id == id, ct);

        /// <summary>Names are stored lowercase, so the lookup normalises too.</summary>
        public Task<Label?> GetByNameAsync(string name, CancellationToken ct = default)
        {
            var normalised = name.Trim().ToLower();
            return _db.Labels.FirstOrDefaultAsync(l => l.Name == normalised, ct);
        }

        public async Task AddAsync(Label label, CancellationToken ct = default)
            => await _db.Labels.AddAsync(label, ct);

        public void Remove(Label label)
            => _db.Labels.Remove(label);
    }
}
