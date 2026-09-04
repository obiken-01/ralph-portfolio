using Ralphy.Domain.Entities.Work;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    public interface IPersonalAccessTokenRepository
    {
        /// <summary>
        /// Looks a token up by the hash of its plaintext. There is deliberately no
        /// lookup by plaintext, and no way to read one back out.
        /// </summary>
        Task<PersonalAccessToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default);

        Task<IReadOnlyList<PersonalAccessToken>> GetForUserAsync(int workUserId, CancellationToken ct = default);

        Task<PersonalAccessToken?> GetByIdAsync(int id, int workUserId, CancellationToken ct = default);

        Task AddAsync(PersonalAccessToken token, CancellationToken ct = default);

        /// <summary>
        /// Stamps LastUsedAt on its own connection. Called on every authenticated
        /// request, so it must not enlist in the caller's UnitOfWork — a failed
        /// request should still record that the credential was used.
        /// </summary>
        Task TouchLastUsedAsync(int id, CancellationToken ct = default);
    }
}
