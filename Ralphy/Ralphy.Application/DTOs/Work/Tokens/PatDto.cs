namespace Ralphy.Application.DTOs.Work.Tokens
{
    /// <summary>
    /// Everything about a token except the token. There is no shape anywhere that
    /// returns the secret after creation, because nothing stores it.
    /// </summary>
    public class PatDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Prefix { get; set; } = string.Empty;
        public List<string> Scopes { get; set; } = new();
        public DateTime? ExpiresAt { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
