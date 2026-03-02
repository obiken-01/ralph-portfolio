using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Ralphy.Application.Mappings;
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

            return services;
        }
    }
}