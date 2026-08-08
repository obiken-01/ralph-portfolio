using Microsoft.AspNetCore.Http;
using Ralphy.Domain.Enums;

namespace Ralphy.Application.DTOs.Photos
{
    public class UploadPhotoDto
    {
        public IFormFile File { get; set; } = null!;
        public string? Caption { get; set; }
        public MediaSource Source { get; set; } = MediaSource.Phone;
        public int PostId { get; set; }
    }
}
