namespace Ralphy.Application.DTOs.ShoppingList
{
    public class ShoppingListItemDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Quantity { get; set; } = 1;
        public string? Unit { get; set; }
        public string? Notes { get; set; }
    }
}