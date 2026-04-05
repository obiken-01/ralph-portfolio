using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Contact;
using Ralphy.Application.Services.Interfaces;

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
        return Ok(ApiResponse<ContactMessageDto>.Created(result));
    }

    [HttpGet("messages")]
    [Authorize]
    public async Task<IActionResult> GetMessages()
    {
        var messages = await _contactService.GetAllMessagesAsync();
        return Ok(ApiResponse<IEnumerable<ContactMessageDto>>.Ok(messages));
    }

    [HttpGet("messages/unread-count")]
    [Authorize]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _contactService.GetUnreadCountAsync();
        return Ok(ApiResponse<object>.Ok(new { count }));
    }

    [HttpPatch("messages/{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        await _contactService.MarkAsReadAsync(id);
        return Ok(ApiResponse.OkMessage("Message marked as read"));
    }

    [HttpDelete("messages/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteMessage(int id)
    {
        await _contactService.DeleteMessageAsync(id);
        return Ok(ApiResponse.OkMessage("Message deleted"));
    }
}