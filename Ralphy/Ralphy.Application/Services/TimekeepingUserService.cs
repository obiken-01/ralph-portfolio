using Ralphy.Application.DTOs.Timekeeping;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services
{
    public class TimekeepingUserService : ITimekeepingUserService
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordService _passwordService;

        public TimekeepingUserService(IUnitOfWork uow, IPasswordService passwordService)
        {
            _uow = uow;
            _passwordService = passwordService;
        }

        public async Task<IEnumerable<TimekeepingUserDto>> GetAllAsync()
        {
            var users = await _uow.TimekeepingUsers.GetAllAsync();
            return users.Select(MapToDto);
        }

        public async Task<TimekeepingUserDto> GetByPublicIdAsync(Guid publicId)
        {
            var user = await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            return MapToDto(user);
        }

        public async Task<TimekeepingUserDto> CreateAsync(CreateTimekeepingUserDto dto)
        {
            var existingByEmail = await _uow.TimekeepingUsers.GetByEmailAsync(dto.Email);
            if (existingByEmail != null)
                throw new InvalidOperationException("Email is already in use");

            var existingByUsername = await _uow.TimekeepingUsers.GetByUsernameAsync(dto.Username);
            if (existingByUsername != null)
                throw new InvalidOperationException("Username is already in use");

            var user = new TimekeepingUser
            {
                PublicId = Guid.NewGuid(),
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = _passwordService.HashPassword(dto.Password),
                IsActive = true
            };

            await _uow.TimekeepingUsers.AddAsync(user);
            await _uow.SaveChangesAsync();

            return MapToDto(user);
        }

        public async Task<TimekeepingUserDto> UpdateAsync(Guid publicId, UpdateTimekeepingUserDto dto)
        {
            var user = await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            var existingByEmail = await _uow.TimekeepingUsers.GetByEmailAsync(dto.Email);
            if (existingByEmail != null && existingByEmail.Id != user.Id)
                throw new InvalidOperationException("Email is already in use");

            var existingByUsername = await _uow.TimekeepingUsers.GetByUsernameAsync(dto.Username);
            if (existingByUsername != null && existingByUsername.Id != user.Id)
                throw new InvalidOperationException("Username is already in use");

            user.Username = dto.Username;
            user.Email = dto.Email;
            user.UpdatedAt = DateTime.UtcNow;

            _uow.TimekeepingUsers.Update(user);
            await _uow.SaveChangesAsync();

            return MapToDto(user);
        }

        public async Task ResetPasswordAsync(Guid publicId, ResetTimekeepingPasswordDto dto)
        {
            var user = await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            user.PasswordHash = _passwordService.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            _uow.TimekeepingUsers.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task ActivateAsync(Guid publicId)
        {
            var user = await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;

            _uow.TimekeepingUsers.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task DeactivateAsync(Guid publicId)
        {
            var user = await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            _uow.TimekeepingUsers.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid publicId)
        {
            var user = await _uow.TimekeepingUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            _uow.TimekeepingUsers.Delete(user);
            await _uow.SaveChangesAsync();
        }

        // --- private helpers ---

        private static TimekeepingUserDto MapToDto(TimekeepingUser user) => new()
        {
            PublicId = user.PublicId,
            Username = user.Username,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}