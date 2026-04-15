namespace Ralphy.Application.DTOs.ShoppingList
{
    public class ParseShoppingListResponseDto
    {
        public List<ShoppingListItemDto> Items { get; set; } = new();
        public int TotalItems { get; set; }
    }
}