namespace Ralphy.Application.DTOs.About
{
    public class UpdateAboutProfileDto
    {
        public string DisplayName { get; set; } = string.Empty;
        public string Headline { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string? InstagramUrl { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }
        public string? YouTubeUrl { get; set; }
    }
}