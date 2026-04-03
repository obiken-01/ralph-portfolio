namespace Ralphy.Application.DTOs.About
{
    public class AboutProfileDto
    {
        public string DisplayName { get; set; } = string.Empty;
        public string Headline { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public string? CoverImageUrl { get; set; }
        public string? CvUrl { get; set; }
        public string? InstagramUrl { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }
        public string? YouTubeUrl { get; set; }
        public List<WorkExperienceDto> WorkExperiences { get; set; } = new();
        public List<SkillDto> Skills { get; set; } = new();
    }
}