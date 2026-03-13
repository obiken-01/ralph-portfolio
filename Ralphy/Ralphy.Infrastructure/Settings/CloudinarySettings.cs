namespace Ralphy.Infrastructure.Settings
{
    public class CloudinarySettings
    {
        public string CloudName { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string ApiSecret { get; set; } = string.Empty;
        public string PhotoPreset { get; set; } = "ralphy_photos";
        public string VideoPreset { get; set; } = "ralphy_videos";
        public string PhotoFolder { get; set; } = "ralphy/photos";
        public string VideoFolder { get; set; } = "ralphy/videos";
    }
}