namespace Ralphy.Domain.Models
{
    /// <summary>
    /// What Cloudinary knows about an asset that already exists. Null width and
    /// height mean the asset could not be read — deleted, renamed, or a
    /// resource type we didn't expect.
    /// </summary>
    public class MediaDimensions
    {
        public int? Width { get; set; }
        public int? Height { get; set; }

        public bool Found => Width > 0 && Height > 0;
    }
}
