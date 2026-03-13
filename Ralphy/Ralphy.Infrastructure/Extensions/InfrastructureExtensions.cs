using CloudinaryDotNet;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Ralphy.Domain.Interfaces;
using Ralphy.Infrastructure.Data;
using Ralphy.Infrastructure.Services;
using Ralphy.Infrastructure.Settings;
using System.Text;

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

            // JWT Authentication
            var secretKey = configuration["Jwt__SecretKey"]
                ?? configuration["Jwt:SecretKey"]
                ?? throw new InvalidOperationException("JWT SecretKey is not configured");

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secretKey)),
                    ValidateIssuer = true,
                    ValidIssuer = configuration["Jwt__Issuer"]
                        ?? configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = configuration["Jwt__Audience"]
                        ?? configuration["Jwt:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero  // No tolerance for expiry
                };

                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        if (context.Exception is SecurityTokenExpiredException)
                        {
                            context.Response.Headers.Append(
                                "Token-Expired", "true");
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            services.AddAuthorization();

            // Add after Password Service registration
            services.Configure<CloudinarySettings>(
                configuration.GetSection("Cloudinary"));

            var cloudinarySettings = new CloudinarySettings();
            configuration.GetSection("Cloudinary").Bind(cloudinarySettings);

            var cloudinaryAccount = new Account(
                cloudinarySettings.CloudName,
                cloudinarySettings.ApiKey,
                cloudinarySettings.ApiSecret);

            services.AddSingleton(new Cloudinary(cloudinaryAccount));
            services.AddScoped<ICloudinaryService, CloudinaryService>();

            return services;
        }
    }
}