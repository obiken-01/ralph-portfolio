namespace Ralphy.Application.DTOs.Work
{
    public class WorkLoginResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public WorkUserDto User { get; set; } = null!;
    }
}
