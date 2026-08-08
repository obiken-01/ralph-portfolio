using AutoMapper;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.DTOs.Comments;
using Ralphy.Application.DTOs.Locations;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.DTOs.Posts;
using Ralphy.Application.DTOs.Tags;
using Ralphy.Domain.Entities;

namespace Ralphy.Application.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mappings
            CreateMap<User, UserDto>();

            // Post mappings
            // The lead photo is the lowest SortOrder image, not the newest —
            // the gallery order is what the card should agree with.
            CreateMap<Post, PostDto>()
                .ForMember(dest => dest.ThumbnailUrl,
                    opt => opt.MapFrom(src => src.Photos
                        .Where(p => p.Type == Domain.Enums.MediaType.Image)
                        .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)
                        .Select(p => p.Url)
                        .FirstOrDefault()))
                .ForMember(dest => dest.ThumbnailWidth,
                    opt => opt.MapFrom(src => src.Photos
                        .Where(p => p.Type == Domain.Enums.MediaType.Image)
                        .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)
                        .Select(p => p.Width)
                        .FirstOrDefault()))
                .ForMember(dest => dest.ThumbnailHeight,
                    opt => opt.MapFrom(src => src.Photos
                        .Where(p => p.Type == Domain.Enums.MediaType.Image)
                        .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)
                        .Select(p => p.Height)
                        .FirstOrDefault()))
                .ForMember(dest => dest.PhotoCount,
                    opt => opt.MapFrom(src => src.Photos
                        .Count(p => p.Type == Domain.Enums.MediaType.Image)))
                // Location may not be loaded on every path — guard rather than throw.
                .ForMember(dest => dest.LocationName,
                    opt => opt.MapFrom(src =>
                        src.Location != null ? src.Location.PlaceName : null))
                .ForMember(dest => dest.LocationIsPlaceholder,
                    opt => opt.MapFrom(src =>
                        src.Location != null && src.Location.IsPlaceholder))
                .ForMember(dest => dest.Tags,
                    opt => opt.MapFrom(src => src.PostTags
                        .Where(pt => pt.Tag != null)
                        .Select(pt => pt.Tag.Name)
                        .ToList()));

            CreateMap<CreatePostDto, Post>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                // Ownership comes from the JWT, never from the request body.
                .ForMember(dest => dest.UserId, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.Location, opt => opt.Ignore())
                .ForMember(dest => dest.Photos, opt => opt.Ignore())
                .ForMember(dest => dest.Comments, opt => opt.Ignore())
                .ForMember(dest => dest.PostTags, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.ViewCount, opt => opt.Ignore())
                .ForMember(dest => dest.TakenAt, opt => opt.Ignore())
                .ForMember(dest => dest.PublishedAt, opt => opt.Ignore());

            CreateMap<UpdatePostDto, Post>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.Location, opt => opt.Ignore())
                .ForMember(dest => dest.Photos, opt => opt.Ignore())
                .ForMember(dest => dest.Comments, opt => opt.Ignore())
                .ForMember(dest => dest.PostTags, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.ViewCount, opt => opt.Ignore())
                .ForMember(dest => dest.TakenAt, opt => opt.Ignore())
                .ForMember(dest => dest.PublishedAt, opt => opt.MapFrom(src =>
                    src.PublishedAt.HasValue
                        ? DateTime.SpecifyKind(src.PublishedAt.Value, DateTimeKind.Utc)
                        : (DateTime?)null));

            CreateMap<Post, PostWithDetailsDto>()
                .ForMember(dest => dest.Photos,
                    opt => opt.MapFrom(src => src.Photos
                        .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)))
                .ForMember(dest => dest.Comments,
                    opt => opt.MapFrom(src => src.Comments))
                .ForMember(dest => dest.LocationName,
                    opt => opt.MapFrom(src =>
                        src.Location != null ? src.Location.PlaceName : null))
                .ForMember(dest => dest.Latitude,
                    opt => opt.MapFrom(src =>
                        src.Location != null ? src.Location.Latitude : (double?)null))
                .ForMember(dest => dest.Longitude,
                    opt => opt.MapFrom(src =>
                        src.Location != null ? src.Location.Longitude : (double?)null))
                .ForMember(dest => dest.LocationIsPlaceholder,
                    opt => opt.MapFrom(src =>
                        src.Location != null && src.Location.IsPlaceholder))
                .ForMember(dest => dest.Tags,
                    opt => opt.MapFrom(src => src.PostTags
                        .Where(pt => pt.Tag != null)
                        .Select(pt => pt.Tag.Name)
                        .ToList()));

            // Tag mappings
            CreateMap<Tag, TagDto>()
                .ForMember(dest => dest.PostCount,
                    opt => opt.MapFrom(src => src.PostTags
                        .Count(pt => pt.Post != null
                            && pt.Post.Status == Domain.Enums.PostStatus.Published)));
            CreateMap<CreateTagDto, Tag>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.PostTags, opt => opt.Ignore());

            // Photo mappings
            CreateMap<Photo, PhotoDto>();

            // Post is guarded because the random-photo query is the only path
            // that loads it, and a unit test may not.
            CreateMap<Photo, FeaturedPhotoDto>()
                .ForMember(dest => dest.PostTitle,
                    opt => opt.MapFrom(src =>
                        src.Post != null ? src.Post.Title : string.Empty))
                .ForMember(dest => dest.LocationName,
                    opt => opt.MapFrom(src =>
                        src.Post != null && src.Post.Location != null
                            && !src.Post.Location.IsPlaceholder
                                ? src.Post.Location.PlaceName
                                : null));

            // Comment mappings
            CreateMap<Comment, CommentDto>();
            CreateMap<CreateCommentDto, Comment>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.PostId, opt => opt.Ignore())
                .ForMember(dest => dest.Post, opt => opt.Ignore());

            // Location mappings
            CreateMap<Location, LocationDto>()
                .ForMember(dest => dest.PostCount,
                    opt => opt.MapFrom(src => src.Posts
                        .Count(p => p.Status == Domain.Enums.PostStatus.Published)));
            CreateMap<CreateLocationDto, Location>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsPlaceholder, opt => opt.Ignore())
                .ForMember(dest => dest.Posts, opt => opt.Ignore());
        }
    }
}