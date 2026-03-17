using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Ralphy.Application.Extensions;
using Ralphy.Infrastructure.Data;
using Ralphy.Infrastructure.Extensions;
using Serilog;

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

    app.UseHttpsRedirection();
    app.UseCors("RalphyPolicy");
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