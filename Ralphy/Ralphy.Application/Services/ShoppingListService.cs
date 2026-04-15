using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Ralphy.Application.DTOs.ShoppingList;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Interfaces;
using System.Text.Json;

namespace Ralphy.Application.Services
{
    public class ShoppingListService : IShoppingListService
    {
        private readonly IAnthropicService _anthropicService;
        private readonly ILogger<ShoppingListService> _logger;

        public ShoppingListService(
            IAnthropicService anthropicService,
            ILogger<ShoppingListService> logger)
        {
            _anthropicService = anthropicService;
            _logger = logger;
        }

        public async Task<ParseShoppingListResponseDto> ParseShoppingListAsync(IFormFile image)
        {
            var rawJson = await _anthropicService.ParseShoppingListAsync(image);

            _logger.LogInformation("Claude raw response: {RawJson}", rawJson);

            // Strip markdown code fences if Claude wraps response in ```json ... ```
            var cleanJson = rawJson
                .Replace("```json", "")
                .Replace("```", "")
                .Trim();

            var items = new List<ShoppingListItemDto>();

            try
            {

                var parsed = JsonSerializer.Deserialize<List<ShoppingListItemDto>>(
                    cleanJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (parsed != null)
                    items = parsed;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse Claude response: {CleanJson}", cleanJson);
            }

            return new ParseShoppingListResponseDto
            {
                Items = items,
                TotalItems = items.Count
            };
        }
    }
}