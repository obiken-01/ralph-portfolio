using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Ralphy.Application.Mappings;
using Ralphy.Application.Services;
using Ralphy.Application.Services.Interfaces;
using System.Reflection;

namespace Ralphy.Application.Extensions
{
    public static class ApplicationExtensions
    {
        public static IServiceCollection AddApplication(
            this IServiceCollection services)
        {
            // AutoMapper
            services.AddAutoMapper(typeof(MappingProfile));

            // FluentValidation
            services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

            // Services
            services.AddScoped<IAuthService, AuthService>();

            return services;
        }
    }
}