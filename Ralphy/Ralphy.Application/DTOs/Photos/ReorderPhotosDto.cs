namespace Ralphy.Application.DTOs.Photos
{
    public class ReorderPhotosDto
    {
        /// <summary>
        /// The post's photo ids in their new order. Must be the complete set —
        /// a partial list would leave the sequence half-rewritten.
        /// </summary>
        public List<int> PhotoIds { get; set; } = new();
    }
}
