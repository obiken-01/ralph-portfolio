using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Services.Interfaces;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Interfaces;

namespace Ralphy.Application.Services.Work
{
    public class WorkUserService : IWorkUserService
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordService _passwordService;

        public WorkUserService(IUnitOfWork uow, IPasswordService passwordService)
        {
            _uow = uow;
            _passwordService = passwordService;
        }

        public async Task<IEnumerable<WorkUserDto>> GetAllAsync()
        {
            var users = await _uow.WorkUsers.GetAllAsync();
            return users.Select(MapToDto);
        }

        public async Task<WorkUserDto> GetByPublicIdAsync(Guid publicId)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            return MapToDto(user);
        }

        public async Task<WorkUserDto> CreateAsync(CreateWorkUserDto dto)
        {
            var existingByEmail = await _uow.WorkUsers.GetByEmailAsync(dto.Email);
            if (existingByEmail != null)
                throw new InvalidOperationException("Email is already in use");

            var existingByUsername = await _uow.WorkUsers.GetByUsernameAsync(dto.Username);
            if (existingByUsername != null)
                throw new InvalidOperationException("Username is already in use");

            var user = new WorkUser
            {
                PublicId = Guid.NewGuid(),
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = _passwordService.HashPassword(dto.Password),
                IsActive = true
            };

            await _uow.WorkUsers.AddAsync(user);
            await _uow.SaveChangesAsync();

            return MapToDto(user);
        }

        public async Task<WorkUserDto> UpdateAsync(Guid publicId, UpdateWorkUserDto dto)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            var existingByEmail = await _uow.WorkUsers.GetByEmailAsync(dto.Email);
            if (existingByEmail != null && existingByEmail.Id != user.Id)
                throw new InvalidOperationException("Email is already in use");

            var existingByUsername = await _uow.WorkUsers.GetByUsernameAsync(dto.Username);
            if (existingByUsername != null && existingByUsername.Id != user.Id)
                throw new InvalidOperationException("Username is already in use");

            user.Username = dto.Username;
            user.Email = dto.Email;
            user.UpdatedAt = DateTime.UtcNow;

            _uow.WorkUsers.Update(user);
            await _uow.SaveChangesAsync();

            return MapToDto(user);
        }

        public async Task ResetPasswordAsync(Guid publicId, ResetWorkPasswordDto dto)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            user.PasswordHash = _passwordService.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            _uow.WorkUsers.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task ActivateAsync(Guid publicId)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;

            _uow.WorkUsers.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task DeactivateAsync(Guid publicId)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            _uow.WorkUsers.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid publicId)
        {
            var user = await _uow.WorkUsers.GetByPublicIdAsync(publicId)
                ?? throw new KeyNotFoundException("User not found");

            _uow.WorkUsers.Delete(user);
            await _uow.SaveChangesAsync();
        }

        // --- private helpers ---

        private static WorkUserDto MapToDto(WorkUser user) => new()
        {
            PublicId = user.PublicId,
            Username = user.Username,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}