namespace Ralphy.Domain.Entities.Work
{
    /// <summary>
    /// A long-lived credential for non-browser clients — Claude Desktop, Claude
    /// Code — that resolves to exactly one WorkUser. Because it resolves to a
    /// user, it inherits that user's project visibility unchanged: there is no
    /// second authorisation path to keep in step with the first.
    /// </summary>
    public class PersonalAccessToken : BaseEntity
    {
        /// <summary>What it is for: "Claude Desktop", "Claude Code — work laptop".</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>SHA-256 of the raw token, hex. The plaintext is never stored.</summary>
        public string TokenHash { get; set; } = string.Empty;

        /// <summary>First few characters, so a listing can identify one: "rpat_a3f9…".</summary>
        public string Prefix { get; set; } = string.Empty;

        /// <summary>Comma-separated, e.g. "tasks:read,tasks:write".</summary>
        public string Scopes { get; set; } = string.Empty;

        public DateTime? ExpiresAt { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public DateTime? RevokedAt { get; set; }

        public int WorkUserId { get; set; }
        public WorkUser User { get; set; } = null!;

        public bool IsActive => RevokedAt is null && (ExpiresAt is null || ExpiresAt > DateTime.UtcNow);

        public bool HasScope(string scope) =>
            Scopes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                  .Contains(scope, StringComparer.OrdinalIgnoreCase);
    }
}
