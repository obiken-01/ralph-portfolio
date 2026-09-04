using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ralphy.Domain.Constants;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces.Repositories.Work;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;

namespace Ralphy.Infrastructure.Services
{
    /// <summary>
    /// Authenticates `Authorization: Bearer rpat_…` personal access tokens.
    ///
    /// This is an authentication scheme rather than the MVC authorization filter
    /// the spec sketches, because a filter cannot work: [Authorize] is enforced by
    /// AuthorizationMiddleware from endpoint metadata, which runs before any MVC
    /// filter, so a PAT request would be rejected before the filter ran. As a
    /// scheme it slots in beside JWT, and every existing Work endpoint accepts
    /// either credential with no change to the controller.
    ///
    /// A PAT resolves to a WorkUserId and mints the same user_type claim a login
    /// would, so it inherits exactly that user's project visibility. There is no
    /// second authorisation path to keep in step with the first.
    /// </summary>
    public class PatAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "Pat";

        private const string BearerPrefix = "Bearer ";
        private const string TokenPrefix = "rpat_";

        private readonly IPersonalAccessTokenRepository _tokens;

        public PatAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            IPersonalAccessTokenRepository tokens)
            : base(options, logger, encoder)
        {
            _tokens = tokens;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var header = Request.Headers.Authorization.ToString();

            // NoResult, not Fail: anything that is not one of our tokens belongs to
            // the JWT scheme, and failing here would shadow its result.
            if (!header.StartsWith(BearerPrefix + TokenPrefix, StringComparison.Ordinal))
                return AuthenticateResult.NoResult();

            var raw = header[BearerPrefix.Length..];
            var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

            var token = await _tokens.GetByHashAsync(hash);

            // Same answer for unknown, expired and revoked — the difference is not
            // the caller's business.
            if (token is null || !token.IsActive)
                return AuthenticateResult.Fail("Invalid or expired access token.");

            await _tokens.TouchLastUsedAsync(token.Id);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, token.WorkUserId.ToString()),
                new(AppClaimTypes.UserType, nameof(UserType.Work)),
            };

            claims.AddRange(token.Scopes
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(scope => new Claim(AppClaimTypes.Scope, scope)));

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));

            return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
        }
    }
}
