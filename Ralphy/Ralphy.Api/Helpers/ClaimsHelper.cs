using Ralphy.Domain.Constants;
using Ralphy.Domain.Enums;
using System.Security.Claims;

namespace Ralphy.Api.Helpers
{
    /// <summary>
    /// Resolves the caller's id, and asserts which identity space it came from.
    ///
    /// The blog and the Work module key off separate tables whose ids overlap, so
    /// reading `sub` without checking user_type lets a blog admin's token address a
    /// WorkUser row of the same number, and vice versa. Both accessors below refuse
    /// a token minted for the other space — that check lives here rather than in the
    /// ~14 controller call sites so it cannot be forgotten at a new one.
    /// </summary>
    public static class ClaimsHelper
    {
        public static int GetUserId(this ClaimsPrincipal user) =>
            GetIdForSpace(user, UserType.Ralphy);

        public static int GetWorkUserId(this ClaimsPrincipal user) =>
            GetIdForSpace(user, UserType.Work);

        private static int GetIdForSpace(ClaimsPrincipal user, UserType expected)
        {
            var userTypeClaim = user.FindFirst(AppClaimTypes.UserType)?.Value;

            // Tokens issued before the claim existed land here. They expire within
            // 15 minutes and the refresh path re-mints them with the claim, so this
            // is a short window, not a lockout.
            if (string.IsNullOrEmpty(userTypeClaim))
                throw new UnauthorizedAccessException(
                    "Token predates user-type scoping. Refresh and retry.");

            if (!string.Equals(userTypeClaim, expected.ToString(), StringComparison.Ordinal))
                throw new UnauthorizedAccessException(
                    "This token belongs to a different account type.");

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? user.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("User ID not found in token");

            return userId;
        }
    }
}
