using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.DTOs.Contact;
using Ralphy.Application.Services.Interfaces;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    [Route("api/contact")]
    public class ContactController : ControllerBase
    {
        private readonly IContactService _contactService;

        public ContactController(IContactService contactService)
        {
            _contactService = contactService;
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] CreateContactMessageDto dto)
        {
            var result = await _contactService.CreateMessageAsync(dto);
            return CreatedAtAction(nameof(SendMessage), result);
        }

        [HttpGet("messages")]
        [Authorize]
        public async Task<IActionResult> GetMessages()
        {
            var messages = await _contactService.GetAllMessagesAsync();
            return Ok(messages);
        }

        [HttpGet("messages/unread-count")]
        [Authorize]
        public async Task<IActionResult> GetUnreadCount()
        {
            var count = await _contactService.GetUnreadCountAsync();
            return Ok(new { count });
        }

        [HttpPatch("messages/{id}/read")]
        [Authorize]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            await _contactService.MarkAsReadAsync(id);
            return NoContent();
        }

        [HttpDelete("messages/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteMessage(int id)
        {
            await _contactService.DeleteMessageAsync(id);
            return NoContent();
        }
    }
}