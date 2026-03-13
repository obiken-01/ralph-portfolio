using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Application.Services
{
    public class PhotoService : IPhotoService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IMapper _mapper;

        public PhotoService(
            IUnitOfWork unitOfWork,
            ICloudinaryService cloudinaryService,
            IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _cloudinaryService = cloudinaryService;
            _mapper = mapper;
        }

        public async Task<PhotoDto> UploadPhotoAsync(
            IFormFile file,
            int postId,
            MediaSource source,
            string? caption,
            int userId)
        {
            // Verify post exists
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            // Verify ownership through trip
            var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to upload photos to this post");

            // Upload to Cloudinary
            var uploadResult = await _cloudinaryService.UploadPhotoAsync(
                file,
                "ralphy/photos"); // ← hardcoded folder

            // Save photo to DB
            var photo = new Photo
            {
                Url = uploadResult.Url,
                PublicId = uploadResult.PublicId,
                Caption = caption,
                Type = MediaType.Image,
                Source = source,
                PostId = postId
            };

            await _unitOfWork.Photos.AddAsync(photo);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<PhotoDto>(photo);
        }

        public async Task<IEnumerable<PhotoDto>> GetByPostIdAsync(int postId)
        {
            var post = await _unitOfWork.Posts.GetByIdAsync(postId);
            if (post == null)
                throw new KeyNotFoundException($"Post with ID {postId} not found");

            var photos = await _unitOfWork.Photos.GetByPostIdAsync(postId);
            return _mapper.Map<IEnumerable<PhotoDto>>(photos);
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var photo = await _unitOfWork.Photos.GetByIdAsync(id);
            if (photo == null)
                throw new KeyNotFoundException($"Photo with ID {id} not found");

            // Verify ownership through post and trip
            var post = await _unitOfWork.Posts.GetByIdAsync(photo.PostId);
            if (post == null)
                throw new KeyNotFoundException("Associated post not found");

            var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
            if (trip == null || trip.UserId != userId)
                throw new UnauthorizedAccessException(
                    "You are not authorized to delete this photo");

            // Delete from Cloudinary
            await _cloudinaryService.DeleteMediaAsync(photo.PublicId);

            // Delete from DB
            await _unitOfWork.Photos.DeleteAsync(photo);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
