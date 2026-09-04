using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces.Repositories.Work;

namespace Ralphy.Infrastructure.Data.Repositories.Work
{
    public class PersonalAccessTokenRepository : IPersonalAccessTokenRepository
    {
        private readonly AppDbContext _db;

        public PersonalAccessTokenRepository(AppDbContext db) => _db = db;

        public Task<PersonalAccessToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default)
            => _db.PersonalAccessTokens
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        public async Task<IReadOnlyList<PersonalAccessToken>> GetForUserAsync(
            int workUserId, CancellationToken ct = default)
            => await _db.PersonalAccessTokens
                .Where(t => t.WorkUserId == workUserId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync(ct);

        public Task<PersonalAccessToken?> GetByIdAsync(int id, int workUserId, CancellationToken ct = default)
            => _db.PersonalAccessTokens
                .FirstOrDefaultAsync(t => t.Id == id && t.WorkUserId == workUserId, ct);

        public async Task AddAsync(PersonalAccessToken token, CancellationToken ct = default)
            => await _db.PersonalAccessTokens.AddAsync(token, ct);

        /// <summary>
        /// A targeted UPDATE rather than a tracked write: this runs during
        /// authentication, before the request has done anything, and must not
        /// become part of whatever the request later saves or rolls back.
        /// </summary>
        public async Task TouchLastUsedAsync(int id, CancellationToken ct = default)
            => await _db.PersonalAccessTokens
                .Where(t => t.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.LastUsedAt, DateTime.UtcNow), ct);
    }
}
