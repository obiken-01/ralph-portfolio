using Ralphy.Application.DTOs.Timekeeping;

namespace Ralphy.Application.Services.Interfaces
{
    public interface ITimeLogService
    {
        Task<PagedTimeLogResultDto> GetFilteredAsync(Guid userPublicId, TimeLogQueryDto query);

        Task<TimeLogDto> GetByIdAsync(Guid userPublicId, int id);

        Task<TimeLogDto> CreateAsync(Guid userPublicId, CreateTimeLogDto dto);

        Task<TimeLogDto> UpdateAsync(Guid userPublicId, int id, UpdateTimeLogDto dto);

        Task DeleteAsync(Guid userPublicId, int id);

        Task<byte[]> ExportCsvAsync(Guid userPublicId, TimeLogQueryDto query);
    }
}