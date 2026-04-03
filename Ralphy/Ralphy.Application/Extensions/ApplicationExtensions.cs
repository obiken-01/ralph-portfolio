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
            services.AddScoped<ITripService, TripService>();
            services.AddScoped<IPostService, PostService>();
            services.AddScoped<ITagService, TagService>();
            services.AddScoped<ILocationService, LocationService>();
            services.AddScoped<ICommentService, CommentService>();
            services.AddScoped<IPhotoService, PhotoService>();
            services.AddScoped<IVideoService, VideoService>();
            services.AddScoped<IAboutService, AboutService>();
            services.AddScoped<IContactService, ContactService>();

            return services;
        }
    }
}