namespace Ralphy.Domain.Entities
{
    /// <summary>
    /// A reusable place record. Many posts point at one location; it no longer
    /// belongs to a trip or to a single user.
    /// </summary>
    public class Location : BaseEntity
    {
        public string PlaceName { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Description { get; set; }

        /// <summary>
        /// True for the seeded stand-in that the v2.0 migration backfills every
        /// post onto. Lets admin surface a "needs a real location" list and lets
        /// the public map skip the pin without matching on the place name.
        /// </summary>
        public bool IsPlaceholder { get; set; }

        // Navigation properties
        public ICollection<Post> Posts { get; set; } = new List<Post>();
    }
}
