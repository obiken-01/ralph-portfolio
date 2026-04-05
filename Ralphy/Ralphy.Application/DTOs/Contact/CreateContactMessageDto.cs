namespace Ralphy.Application.DTOs.Contact
{
    public class CreateContactMessageDto
    {
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorEmail { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}