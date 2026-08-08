using AutoMapper;
using Microsoft.AspNetCore.Http;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class VideoService : IVideoService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IMapper _mapper;

        public VideoService(
            IUnitOfWork unitOfWork,
            ICloudinaryService cloudinaryService,
            IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _cloudinaryService = cloudinaryService;
            _mapper = mapper;
        }

        public async Task<PhotoDto> UploadVideoAsync(
            IFormFile file,
            int postId,
            string? caption,
            int userId)
        {
            // Verify post exists
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            if (post.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to upload videos to this post");

            // Upload to Cloudinary
            var uploadResult = await _cloudinaryService.UploadVideoAsync(
                file,
                "ralphy/videos");

            // Save video as Photo entity with MediaType.Video
            var video = new Photo
            {
                Url = uploadResult.Url,
                PublicId = uploadResult.PublicId,
                Caption = caption,
                Type = MediaType.Video,
                PostId = postId
            };

            await _unitOfWork.Photos.AddAsync(video);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<PhotoDto>(video);
        }

        public async Task<IEnumerable<PhotoDto>> GetVideosByPostIdAsync(int postId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            var photos = await _unitOfWork.Photos.GetByPostIdAsync(postId);

            // Filter only videos
            var videos = photos.Where(p => p.Type == MediaType.Video);
            return _mapper.Map<IEnumerable<PhotoDto>>(videos);
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var video = await _unitOfWork.Photos.GetByIdAsync(id);
            if (video == null)
                throw new KeyNotFoundException($"Video with ID {id} not found");

            if (video.Type != MediaType.Video)
                throw new InvalidOperationException("Media is not a video");

            var post = await _unitOfWork.Posts.GetByIdAsync(video.PostId);
            if (post == null)
                throw new KeyNotFoundException("Associated post not found");

            if (post.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to delete this video");

            // Delete from Cloudinary as video resource type
            await _cloudinaryService.DeleteMediaAsync(video.PublicId, isVideo: true);

            // Delete from DB
            await _unitOfWork.Photos.DeleteAsync(video);
            await _unitOfWork.SaveChangesAsync();
        }

    }
}