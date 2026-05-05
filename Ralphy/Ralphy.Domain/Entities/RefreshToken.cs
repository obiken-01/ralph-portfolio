using Ralphy.Domain.Enums;

namespace Ralphy.Domain.Entities
{
    public class RefreshToken : BaseEntity
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? ReplacedByToken { get; set; }
        public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
        public bool IsRevoked => RevokedAt != null;
        public bool IsActive => !IsRevoked && !IsExpired;
        public UserType UserType { get; set; } = UserType.Ralphy;

        // Foreign key
        public int UserId { get; set; }

        public User User { get; set; } = null!;
    }
}