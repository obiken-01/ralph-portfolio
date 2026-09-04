using Ralphy.Domain.Entities.Work;

namespace Ralphy.Domain.Interfaces.Repositories.Work
{
    /// <summary>
    /// Labels are workspace-wide, so unlike the other Work repositories these reads
    /// take no userId — there is nothing to scope them to.
    /// </summary>
    public interface ILabelRepository
    {
        Task<IReadOnlyList<Label>> GetAllAsync(CancellationToken ct = default);

        Task<Label?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<Label?> GetByNameAsync(string name, CancellationToken ct = default);

        Task AddAsync(Label label, CancellationToken ct = default);

        void Remove(Label label);
    }
}
