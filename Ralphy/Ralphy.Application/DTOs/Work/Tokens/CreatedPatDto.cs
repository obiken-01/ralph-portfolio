namespace Ralphy.Application.DTOs.Work.Tokens
{
    public class CreatedPatDto : PatDto
    {
        /// <summary>
        /// The plaintext, returned exactly once. Only its SHA-256 is persisted, so
        /// if the caller loses this the only remedy is to issue a new token.
        /// </summary>
        public string Token { get; set; } = string.Empty;
    }
}
