using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.ShoppingList;

namespace Ralphy.Application.Services.Interfaces
{
    public interface IShoppingListService
    {
        Task<ParseShoppingListResponseDto> ParseShoppingListAsync(IFormFile image);
    }
}