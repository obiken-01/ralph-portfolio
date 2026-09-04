namespace Ralphy.Domain.Entities.Work
{
    /// <summary>
    /// A user of the Work module — a separate identity space from the blog's
    /// <see cref="Ralphy.Domain.Entities.User"/>. The two share an integer key
    /// sequence but nothing else,
    /// which is why access tokens carry a user_type claim.
    /// </summary>
    public class WorkUser : BaseEntity
    {
        public Guid PublicId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;

        public ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
    }
}
