using CloudinaryDotNet;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Ralphy.Domain.Constants;
using Ralphy.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Interfaces.Repositories.Work;
using Ralphy.Infrastructure.Data.Repositories.Work;
using Ralphy.Infrastructure.Data;
using Ralphy.Infrastructure.Services;
using Ralphy.Infrastructure.Settings;
using Microsoft.AspNetCore.Authentication;
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

            // The PAT handler needs this directly, outside the UnitOfWork: it runs
            // during authentication, before any request scope has done work.
            services.AddScoped<IPersonalAccessTokenRepository, PersonalAccessTokenRepository>();
            services.AddSingleton<IAuthorizationHandler, WorkScopeHandler>();

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddScheme<AuthenticationSchemeOptions, PatAuthenticationHandler>(
                PatAuthenticationHandler.SchemeName, _ => { })
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

            // Two identity spaces share this JWT scheme, so a bare [Authorize] is
            // never enough — it proves the token is signed, not which table its
            // `sub` indexes. Every protected endpoint picks one of these.
            services.AddAuthorization(options =>
            {
                // Work endpoints accept either credential: a browser JWT or a
                // personal access token. Both resolve to the same WorkUserId, so
                // visibility and project roles apply identically to each.
                var workSchemes = new[]
                {
                    JwtBearerDefaults.AuthenticationScheme,
                    PatAuthenticationHandler.SchemeName,
                };

                options.AddPolicy("WorkUser", policy => policy
                    .AddAuthenticationSchemes(workSchemes)
                    .RequireClaim(AppClaimTypes.UserType, nameof(UserType.Work)));

                options.AddPolicy("WorkRead", policy => policy
                    .AddAuthenticationSchemes(workSchemes)
                    .RequireClaim(AppClaimTypes.UserType, nameof(UserType.Work))
                    .AddRequirements(new WorkScopeRequirement("tasks:read")));

                options.AddPolicy("WorkWrite", policy => policy
                    .AddAuthenticationSchemes(workSchemes)
                    .RequireClaim(AppClaimTypes.UserType, nameof(UserType.Work))
                    .AddRequirements(new WorkScopeRequirement("tasks:write")));

                // Issuing and revoking credentials is a browser action. If a PAT
                // could reach this, a read-only token could mint itself a
                // write-scoped one and the scope split would mean nothing.
                options.AddPolicy("WorkSession", policy => policy
                    .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
                    .RequireClaim(AppClaimTypes.UserType, nameof(UserType.Work)));

                // Deliberately JWT-only. Personal access tokens are a Work-module
                // credential and must never reach account administration.
                options.AddPolicy("RalphyAdmin", policy => policy
                    .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
                    .RequireClaim(AppClaimTypes.UserType, nameof(UserType.Ralphy)));
            });

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

            // Anthropic
            services.Configure<AnthropicSettings>(
                configuration.GetSection("Anthropic"));

            services.AddHttpClient<IAnthropicService, AnthropicService>();

            services.Configure<ShoppingListSettings>(
                configuration.GetSection("ShoppingList"));

            return services;
        }
    }
}