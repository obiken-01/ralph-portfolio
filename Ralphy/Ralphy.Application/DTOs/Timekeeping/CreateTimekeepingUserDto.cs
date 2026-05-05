namespace Ralphy.Application.DTOs.Timekeeping
{
    public class CreateTimekeepingUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}