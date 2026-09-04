using Ralphy.Application.DTOs.Work.Accomplishments;

namespace Ralphy.Application.Services.Interfaces
{
    /// <summary>
    /// Always self-scoped. There is deliberately no parameter for reading someone
    /// else's accomplishments — project membership must never widen this.
    /// </summary>
    public interface IAccomplishmentService
    {
        Task<AccomplishmentRangeDto> GetAsync(int userId, DateOnly from, DateOnly to);
    }
}
