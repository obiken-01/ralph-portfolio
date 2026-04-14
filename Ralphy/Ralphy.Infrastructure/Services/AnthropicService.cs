using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Ralphy.Domain.Interfaces;
using Ralphy.Infrastructure.Settings;
using System.Text;
using System.Text.Json;

namespace Ralphy.Infrastructure.Services
{
    public class AnthropicService : IAnthropicService
    {
        private readonly AnthropicSettings _settings;
        private readonly HttpClient _httpClient;

        public AnthropicService(IOptions<AnthropicSettings> settings, HttpClient httpClient)
        {
            _settings = settings.Value;
            _httpClient = httpClient;
        }

        public async Task<string> ParseShoppingListAsync(IFormFile image)
        {
            // Convert image to base64
            using var memoryStream = new MemoryStream();
            await image.CopyToAsync(memoryStream);
            var base64Image = Convert.ToBase64String(memoryStream.ToArray());
            var mediaType = image.ContentType;

            var prompt = """
                You are a shopping list parser familiar with Filipino grocery items.
                Analyze this handwritten shopping list image carefully.

                The list may have multiple columns — read ALL columns left to right.

                Common Filipino grocery items for context (use these to correct spelling):
                - mantika (cooking oil)
                - suka (vinegar)
                - asin (salt)
                - toyo (soy sauce)
                - patis (fish sauce)
                - Alaska evap (evaporated milk)
                - Alaska condensed (condensed milk)
                - corned beef
                - Safeguard (soap brand)
                - Tide (laundry detergent)
                - Joy (dishwashing liquid)
                - Bravo (brand)
                - oyster sauce
                - barbecue marinade

                Extract every item and return ONLY a valid JSON array with no extra text, markdown, or explanation.

                Each item must follow this exact structure:
                {
                  "name": "item name",
                  "quantity": 1,
                  "unit": null,
                  "notes": null
                }

                Rules:
                - "name" is always a string (required)
                - "quantity" is a number, default to 1 if not specified
                - "unit" is a string like "kg", "g", "L", "ml", or null if not specified
                - "notes" is any extra description like "small", "large", "white", or null
                - Do not include prices or amounts
                - Use the Filipino grocery context above to correct obvious misspellings
                - If you cannot read a word clearly, make your best guess

                Return ONLY the JSON array. No explanation. No markdown code blocks.
                """;

            var requestBody = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 1024,
                messages = new[]
                {
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new
                            {
                                type = "image",
                                source = new
                                {
                                    type = "base64",
                                    media_type = mediaType,
                                    data = base64Image
                                }
                            },
                            new
                            {
                                type = "text",
                                text = prompt
                            }
                        }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
            _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var response = await _httpClient.PostAsync(
                "https://api.anthropic.com/v1/messages", content);

            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseJson = JsonDocument.Parse(responseBody);

            // Extract the text content from Claude's response
            var text = responseJson
                .RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "[]";

            return text;
        }
    }
}