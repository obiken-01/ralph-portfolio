namespace Ralphy.Domain.Constants
{
    /// <summary>
    /// Custom JWT claim types.
    ///
    /// The blog and the Work module are separate identity spaces backed by separate
    /// tables, but both mint <c>sub</c> from an int primary key. Without a claim
    /// saying which space a token belongs to, blog User #5 and WorkUser #5 are
    /// indistinguishable to <c>[Authorize]</c> — and each would read the other's data.
    /// </summary>
    public static class AppClaimTypes
    {
        public const string UserType = "user_type";

        /// <summary>
        /// Repeated once per granted PAT scope. Absent on tokens minted by a
        /// login, which is how an unrestricted browser session is told apart from
        /// a deliberately narrowed machine credential.
        /// </summary>
        public const string Scope = "scope";
    }
}
