using Microsoft.EntityFrameworkCore;
using Ralphy.Application.Common;
using System.Net;
using System.Text.Json;

namespace Ralphy.Api.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(
            RequestDelegate next,
            ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unhandled exception for {Method} {Path}",
                    context.Request.Method,
                    context.Request.Path);

                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(
            HttpContext context, Exception ex)
        {
            context.Response.ContentType = "application/json";

            var (statusCode, message) = ex switch
            {
                // Two people moved the same card. The frontend treats 409 as
                // "invalidate and refetch the board", not as an error toast — so
                // this must not fall through to a 500.
                DbUpdateConcurrencyException =>
                    (HttpStatusCode.Conflict,
                    "This item was changed by someone else. Refreshing."),
                KeyNotFoundException =>
                    (HttpStatusCode.NotFound, ex.Message),
                UnauthorizedAccessException =>
                    (HttpStatusCode.Unauthorized, ex.Message),
                InvalidOperationException =>
                    (HttpStatusCode.BadRequest, ex.Message),
                ArgumentException =>
                    (HttpStatusCode.BadRequest, ex.Message),
                _ =>
                    (HttpStatusCode.InternalServerError,
                    "An unexpected error occurred")
            };

            context.Response.StatusCode = (int)statusCode;

            var response = ApiResponse<object>.Fail(
                (int)statusCode, message);

            var json = JsonSerializer.Serialize(response,
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

            await context.Response.WriteAsync(json);
        }
    }
}
