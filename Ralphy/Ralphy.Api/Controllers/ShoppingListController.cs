using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ralphy.Api.Attributes;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.ShoppingList;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/shopping-list")]
    public class ShoppingListController : ControllerBase
    {
        private readonly IShoppingListService _shoppingListService;

        public ShoppingListController(IShoppingListService shoppingListService)
        {
            _shoppingListService = shoppingListService;
        }

        [HttpPost("parse")]
        [ShoppingListApiKey]
        [EnableRateLimiting("shopping-list")]
        public async Task<IActionResult> Parse(IFormFile image)
        {
            if (image == null || image.Length == 0)
                return BadRequest(ApiResponse<string>.Fail(400, "No image provided."));

            if (!image.ContentType.StartsWith("image/"))
                return BadRequest(ApiResponse<string>.Fail(400, "File must be an image."));

            if (image.Length > 10 * 1024 * 1024)
                return BadRequest(ApiResponse<string>.Fail(400, "Image must be under 10MB."));

            var result = await _shoppingListService.ParseShoppingListAsync(image);
            return Ok(ApiResponse<ParseShoppingListResponseDto>.Ok(result));
        }
    }
}