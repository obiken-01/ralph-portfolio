using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ralphy.Domain.Interfaces;
using Ralphy.Infrastructure.Data;
using Ralphy.Infrastructure.Services;

namespace Ralphy.Infrastructure.Extensions
{
    public static class InfrastructureExtensions
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // PostgreSQL
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(configuration.GetConnectionString("Default")));

            // Unit of Work
            services.AddScoped<IUnitOfWork, UnitOfWork>();

            // Token Service
            services.AddScoped<ITokenService, TokenService>();

            // Password Service
            services.AddScoped<IPasswordService, PasswordService>();

            return services;
        }
    }
}