using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Ralphy.Api.Helpers;
using Ralphy.Domain.Constants;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The blog and the Work module are separate tables whose integer ids overlap:
/// blog User #5 and WorkUser #5 are different people. Before user_type scoping,
/// every access token looked identical, so a bare [Authorize] endpoint would
/// happily resolve one's `sub` against the other's table — a Ralphy admin could
/// read a work user's time logs, and a work user could administer work accounts.
///
/// Nothing on screen would show that going wrong, which is why it is pinned here
/// rather than left to a manual smoke test.
/// </summary>
public class IdentitySpaceTests
{
    private static readonly TokenService Tokens = new(
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "test-signing-key-long-enough-for-hmac-sha256-!!",
                ["Jwt:Issuer"] = "ralphy-test",
                ["Jwt:Audience"] = "ralphy-test",
            })
            .Build());

    /// <summary>Reads a minted token back the way the JWT middleware would.</summary>
    private static ClaimsPrincipal Principal(string jwt)
    {
        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        // The middleware maps `sub` to NameIdentifier; mirror that here so the
        // helper is exercised against the shape it actually sees at runtime.
        var claims = token.Claims
            .Select(c => c.Type == JwtRegisteredClaimNames.Sub
                ? new Claim(ClaimTypes.NameIdentifier, c.Value)
                : c)
            .ToList();

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private static ClaimsPrincipal RalphyToken(int id = 5) =>
        Principal(Tokens.GenerateAccessToken(
            new User { Id = id, Email = "ralph@example.com", Username = "ralph" }));

    private static ClaimsPrincipal WorkToken(int id = 5) =>
        Principal(Tokens.GenerateAccessToken(
            id, "worker@example.com", "worker", UserType.Work));

    // ── the claim is actually minted ─────────────────────────────────

    [Fact]
    public void Blog_tokens_are_stamped_Ralphy()
    {
        RalphyToken().FindFirst(AppClaimTypes.UserType)!.Value
            .Should().Be(nameof(UserType.Ralphy));
    }

    [Fact]
    public void Work_tokens_are_stamped_Work()
    {
        WorkToken().FindFirst(AppClaimTypes.UserType)!.Value
            .Should().Be(nameof(UserType.Work));
    }

    // ── each space accepts its own ───────────────────────────────────

    [Fact]
    public void A_work_token_resolves_a_work_user_id()
    {
        WorkToken(id: 5).GetWorkUserId().Should().Be(5);
    }

    [Fact]
    public void A_blog_token_resolves_a_blog_user_id()
    {
        RalphyToken(id: 5).GetUserId().Should().Be(5);
    }

    // ── and refuses the other ────────────────────────────────────────

    [Fact]
    public void A_blog_token_cannot_address_a_work_user_of_the_same_id()
    {
        var act = () => RalphyToken(id: 5).GetWorkUserId();

        act.Should().Throw<UnauthorizedAccessException>();
    }

    [Fact]
    public void A_work_token_cannot_address_a_blog_user_of_the_same_id()
    {
        var act = () => WorkToken(id: 5).GetUserId();

        act.Should().Throw<UnauthorizedAccessException>();
    }

    // ── tokens minted before the claim existed ───────────────────────

    [Fact]
    public void A_token_without_the_claim_is_refused_by_both_spaces()
    {
        var legacy = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "5") }, "TestAuth"));

        legacy.Invoking(p => p.GetWorkUserId())
            .Should().Throw<UnauthorizedAccessException>();
        legacy.Invoking(p => p.GetUserId())
            .Should().Throw<UnauthorizedAccessException>();
    }
}
