using Ralphy.Application.DTOs.Work.Labels;

namespace Ralphy.Application.Services.Interfaces
{
    /// <summary>
    /// Labels are workspace-wide, so nothing here takes a userId. Any
    /// authenticated work user may read and manage them.
    /// </summary>
    public interface ILabelService
    {
        Task<IEnumerable<LabelDto>> GetAllAsync();

        Task<LabelDto> CreateAsync(SaveLabelDto dto);

        Task<LabelDto> UpdateAsync(int id, SaveLabelDto dto);

        Task DeleteAsync(int id);
    }
}
