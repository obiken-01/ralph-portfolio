using Microsoft.OpenApi.Models;
using Serilog;
using Ralphy.Infrastructure.Extensions;
using Ralphy.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Serilog must be configured BEFORE builder
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/ralphy-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    // Add services to the container
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Ralphy API",
            Version = "v1",
            Description = "Personal Travel Blog API for Ralphy"
        });
    });

    // Register Infrastructure
    builder.Services.AddInfrastructure(builder.Configuration);

    var app = builder.Build();

    // Auto migrate on startup
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }

    // Enable Swagger in Development
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
    app.UseAuthorization();
    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    // Catch startup errors and log them
    Log.Fatal(ex, "Application failed to start");
}
finally
{
    Log.CloseAndFlush();
}