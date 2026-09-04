using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Ralphy.Application.Common;
using Ralphy.Application.Extensions;
using Ralphy.Infrastructure.Data;
using Ralphy.Infrastructure.Extensions;
using Serilog;
using System.Threading.RateLimiting;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.Seq("http://seq:5341")
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) =>
        configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext());

    // Allow large file uploads (100MB for videos)
    builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 100 * 1024 * 1024;
    });

    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 100 * 1024 * 1024;
    });

    // CORS
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? Array.Empty<string>();

    Log.Information("CORS allowed origins: {Origins}",
    string.Join(", ", allowedOrigins));

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("RalphyPolicy", policy =>
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    // Rate Limiting
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("shopping-list", limiterOptions =>
        {
            limiterOptions.PermitLimit = 10;
            limiterOptions.Window = TimeSpan.FromHours(1);
            limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            limiterOptions.QueueLimit = 0;
        });

        options.RejectionStatusCode = 429;

        options.OnRejected = async (context, cancellationToken) =>
        {
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsJsonAsync(
                ApiResponse<string>.Fail(429, "Too many requests. Limit is 10 per hour."),
                cancellationToken);
        };
    });

    builder.Services.AddControllers()
        .ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .SelectMany(e => e.Value!.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return new BadRequestObjectResult(new
                {
                    StatusCode = 400,
                    Message = "Validation failed",
                    Errors = errors
                });
            };
        });

    builder.Services.AddEndpointsApiExplorer();

    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Ralphy API",
            Version = "v1",
            Description = "Personal Travel Blog API for Ralphy"
        });

        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter your JWT token. Example: eyJhbGci..."
        });

        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    // Register Infrastructure and Application
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApplication();

    var app = builder.Build();

    // Auto migrate on startup with retry logic
    using (var scope = app.Services.CreateScope())
    {
        var logger = scope.ServiceProvider
            .GetRequiredService<ILogger<Program>>();

        var retries = 5;
        var delay = TimeSpan.FromSeconds(5);

        for (int i = 1; i <= retries; i++)
        {
            try
            {
                logger.LogInformation(
                    "Attempting database migration (attempt {Attempt} of {MaxRetries})",
                    i, retries);

                var db = scope.ServiceProvider
                    .GetRequiredService<AppDbContext>();

                db.Database.Migrate();

                logger.LogInformation(
                    "Database migration completed successfully");
                break;
            }
            catch (Exception ex)
            {
                if (i == retries)
                {
                    logger.LogCritical(ex,
                        "Database migration failed after {MaxRetries} attempts. Shutting down.",
                        retries);
                    throw;
                }

                logger.LogWarning(ex,
                    "Database migration attempt {Attempt} failed. " +
                    "Retrying in {Delay} seconds...",
                    i, delay.TotalSeconds);

                Thread.Sleep(delay);
            }
        }
    }

    app.UseMiddleware<Ralphy.Api.Middleware.ExceptionMiddleware>();

    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Ralphy API v1");
            c.RoutePrefix = "swagger";
        });
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    // Handle OPTIONS preflight requests explicitly
    app.Use(async (context, next) =>
    {
        if (context.Request.Method == "OPTIONS")
        {
            context.Response.Headers.Append("Access-Control-Allow-Origin",
                context.Request.Headers["Origin"].ToString());
            context.Response.Headers.Append("Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, PATCH, OPTIONS");
            context.Response.Headers.Append("Access-Control-Allow-Headers",
                "Content-Type, Authorization, X-Api-Key");
            context.Response.Headers.Append("Access-Control-Allow-Credentials",
                "true");
            context.Response.Headers.Append("Cache-Control", "no-store, no-cache");
            context.Response.StatusCode = 200;
            await context.Response.CompleteAsync();
            return;
        }
        await next();
    });

    app.UseCors("RalphyPolicy");

    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    Log.Information("Ralphy API is starting...");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start");
}
finally
{
    Log.CloseAndFlush();
}