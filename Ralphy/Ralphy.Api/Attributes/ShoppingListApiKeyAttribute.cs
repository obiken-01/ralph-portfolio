using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Ralphy.Application.Common;
using Ralphy.Infrastructure.Settings;

namespace Ralphy.Api.Attributes
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
    public class ShoppingListApiKeyAttribute : Attribute, IAsyncActionFilter
    {
        private const string ApiKeyHeader = "X-Api-Key";

        public async Task OnActionExecutionAsync(
            ActionExecutingContext context,
            ActionExecutionDelegate next)
        {
            var settings = context.HttpContext.RequestServices
                .GetRequiredService<IOptions<ShoppingListSettings>>().Value;

            if (!context.HttpContext.Request.Headers
                .TryGetValue(ApiKeyHeader, out var extractedApiKey))
            {
                context.Result = new UnauthorizedObjectResult(
                    ApiResponse<string>.Fail(401, "API key is missing."));
                return;
            }

            if (!string.Equals(extractedApiKey,
                settings.ApiKey,
                StringComparison.OrdinalIgnoreCase))
            {
                context.Result = new UnauthorizedObjectResult(
                    ApiResponse<string>.Fail(401, "Invalid API key."));
                return;
            }

            await next();
        }
    }
}
