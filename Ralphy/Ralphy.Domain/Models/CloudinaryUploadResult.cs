namespace Ralphy.Domain.Models
{
    public class CloudinaryUploadResult
    {
        public string Url { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string Format { get; set; } = string.Empty;
        public long Size { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public string ResourceType { get; set; } = string.Empty;
    }
}