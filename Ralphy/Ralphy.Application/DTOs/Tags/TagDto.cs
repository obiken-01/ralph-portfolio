namespace Ralphy.Application.DTOs.Tags
{
    public class TagDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        /// <summary>Published posts carrying this tag. Sorts the tag bar.</summary>
        public int PostCount { get; set; }
    }
}
