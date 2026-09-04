using Ralphy.Application.DTOs.Work.Tokens;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IPatService
    {
        Task<IEnumerable<PatDto>> GetAllAsync(int userId);

        /// <summary>The only call that ever returns the plaintext.</summary>
        Task<CreatedPatDto> CreateAsync(int userId, CreatePatDto dto);

        Task RevokeAsync(int userId, int id);
    }
}
