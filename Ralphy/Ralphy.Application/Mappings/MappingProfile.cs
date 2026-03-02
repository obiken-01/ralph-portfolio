using AutoMapper;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Comments;
using Ralphy.Application.DTOs.Locations;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.DTOs.Posts;
using Ralphy.Application.DTOs.Trips;
using Ralphy.Domain.Entities;

namespace Ralphy.Application.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mappings
            CreateMap<User, UserDto>();

            // Trip mappings
            CreateMap<Trip, TripDto>();
            CreateMap<CreateTripDto, Trip>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.Posts, opt => opt.Ignore())
                .ForMember(dest => dest.Locations, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.CoverImageUrl, opt => opt.Ignore());

            CreateMap<UpdateTripDto, Trip>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.Posts, opt => opt.Ignore())
                .ForMember(dest => dest.Locations, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore());

            // Post mappings
            CreateMap<Post, PostDto>();
            CreateMap<CreatePostDto, Post>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Trip, opt => opt.Ignore())
                .ForMember(dest => dest.Photos, opt => opt.Ignore())
                .ForMember(dest => dest.Comments, opt => opt.Ignore())
                .ForMember(dest => dest.PostTags, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.ViewCount, opt => opt.Ignore())
                .ForMember(dest => dest.PublishedAt, opt => opt.Ignore());

            CreateMap<UpdatePostDto, Post>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.TripId, opt => opt.Ignore())
                .ForMember(dest => dest.Trip, opt => opt.Ignore())
                .ForMember(dest => dest.Photos, opt => opt.Ignore())
                .ForMember(dest => dest.Comments, opt => opt.Ignore())
                .ForMember(dest => dest.PostTags, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.ViewCount, opt => opt.Ignore())
                .ForMember(dest => dest.PublishedAt, opt => opt.Ignore());

            // Photo mappings
            CreateMap<Photo, PhotoDto>();

            // Comment mappings
            CreateMap<Comment, CommentDto>();
            CreateMap<CreateCommentDto, Comment>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.PostId, opt => opt.Ignore())
                .ForMember(dest => dest.Post, opt => opt.Ignore());

            // Location mappings
            CreateMap<Location, LocationDto>();
            CreateMap<CreateLocationDto, Location>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Trip, opt => opt.Ignore());
        }
    }
}