using Ralphy.Application.DTOs.Work.Labels;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services.Work
{
    public class LabelService : ILabelService
    {
        private readonly IUnitOfWork _uow;

        public LabelService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<IEnumerable<LabelDto>> GetAllAsync()
        {
            var labels = await _uow.Labels.GetAllAsync();
            return labels.Select(MapToDto).ToList();
        }

        public async Task<LabelDto> CreateAsync(SaveLabelDto dto)
        {
            var name = Normalise(dto.Name);

            if (await _uow.Labels.GetByNameAsync(name) is not null)
                throw new InvalidOperationException($"A label named \"{name}\" already exists.");

            var label = new Label { Name = name, ColorHex = dto.ColorHex };

            await _uow.Labels.AddAsync(label);
            await _uow.SaveChangesAsync();

            return MapToDto(label);
        }

        public async Task<LabelDto> UpdateAsync(int id, SaveLabelDto dto)
        {
            var label = await _uow.Labels.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("Label not found");

            var name = Normalise(dto.Name);

            var clash = await _uow.Labels.GetByNameAsync(name);
            if (clash is not null && clash.Id != label.Id)
                throw new InvalidOperationException($"A label named \"{name}\" already exists.");

            label.Name = name;
            label.ColorHex = dto.ColorHex;
            label.UpdatedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();

            return MapToDto(label);
        }

        public async Task DeleteAsync(int id)
        {
            var label = await _uow.Labels.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("Label not found");

            // The WorkItemLabels join rows cascade — a label going away unlabels
            // the tasks that carried it, it does not delete them.
            _uow.Labels.Remove(label);
            await _uow.SaveChangesAsync();
        }

        // --- private helpers ---

        /// <summary>
        /// Names are stored lowercase so "Urgent" and "urgent" cannot coexist and
        /// split a filter in two.
        /// </summary>
        private static string Normalise(string name) => name.Trim().ToLower();

        private static LabelDto MapToDto(Label label) => new()
        {
            Id = label.Id,
            Name = label.Name,
            ColorHex = label.ColorHex,
        };
    }
}
