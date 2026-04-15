using Microsoft.AspNetCore.Http;

namespace Ralphy.Domain.Interfaces
{
    public interface IAnthropicService
    {
        Task<string> ParseShoppingListAsync(IFormFile image);
    }
}