using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Ralphy.Application.DTOs.Work.Tokens;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Constants;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Data;
using Ralphy.Infrastructure.Services;
using System.Security.Claims;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Personal access tokens, and the scope split that makes a read-only credential
/// meaningful. A token is a bearer secret with no second factor and a long life,
/// so the invariants worth asserting are: the plaintext is never stored, it is
/// returned exactly once, and a narrowed token stays narrow.
/// </summary>
public class PersonalAccessTokenTests
{
    private static PatService Tokens(TestDb db) => new(new UnitOfWork(db.Context));

    private static CreatePatDto NewToken(params string[] scopes) => new()
    {
        Name = "Claude Desktop",
        Scopes = scopes.Length > 0 ? scopes.ToList() : new List<string> { PatScopes.TasksRead },
    };

    // ── issuing ──────────────────────────────────────────────────────

    [Fact]
    public async Task A_new_token_comes_back_once_in_the_documented_format()
    {
        using var db = new TestDb();

        var created = await Tokens(db).CreateAsync(TestDb.WorkerId, NewToken());

        created.Token.Should().StartWith("rpat_");
        created.Token.Length.Should().BeGreaterThan(40);
        created.Prefix.Should().Be(created.Token[..9]);
    }

    [Fact]
    public async Task Only_the_hash_is_persisted()
    {
        using var db = new TestDb();
        var created = await Tokens(db).CreateAsync(TestDb.WorkerId, NewToken());
        db.SimulateNewRequest();

        var stored = db.Context.PersonalAccessTokens.Single();

        stored.TokenHash.Should().Be(PatService.Hash(created.Token));
        stored.TokenHash.Should().NotBe(created.Token);

        // Nothing anywhere in the row should let the secret be reconstructed.
        var row = string.Join("|", stored.Name, stored.TokenHash, stored.Prefix, stored.Scopes);
        row.Should().NotContain(created.Token);
    }

    [Fact]
    public async Task Listing_tokens_never_returns_the_secret()
    {
        using var db = new TestDb();
        await Tokens(db).CreateAsync(TestDb.WorkerId, NewToken());
        db.SimulateNewRequest();

        var listed = await Tokens(db).GetAllAsync(TestDb.WorkerId);

        // PatDto has no Token property at all — this asserts the shape, not a value.
        listed.Should().ContainSingle().Which.Should().BeOfType<PatDto>();
        typeof(PatDto).GetProperty("Token").Should().BeNull();
    }

    [Fact]
    public async Task Tokens_default_to_read_only()
    {
        using var db = new TestDb();

        var created = await Tokens(db).CreateAsync(
            TestDb.WorkerId, new CreatePatDto { Name = "Unspecified" });

        // Handing out write access should be a decision, not a default.
        created.Scopes.Should().BeEquivalentTo(PatScopes.TasksRead);
    }

    [Fact]
    public async Task An_unknown_scope_is_refused()
    {
        using var db = new TestDb();

        var act = () => Tokens(db).CreateAsync(TestDb.WorkerId, NewToken("tasks:destroy"));

        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Unknown scope*");
    }

    [Fact]
    public async Task An_expiry_in_the_past_is_refused()
    {
        using var db = new TestDb();

        var act = () => Tokens(db).CreateAsync(TestDb.WorkerId, new CreatePatDto
        {
            Name = "Stale",
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
        });

        await act.Should().ThrowAsync<ArgumentException>();
    }

    // ── revoking ─────────────────────────────────────────────────────

    [Fact]
    public async Task Revoking_deactivates_the_token()
    {
        using var db = new TestDb();
        var created = await Tokens(db).CreateAsync(TestDb.WorkerId, NewToken());
        db.SimulateNewRequest();

        await Tokens(db).RevokeAsync(TestDb.WorkerId, created.Id);

        db.Context.PersonalAccessTokens.Single().IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task You_cannot_revoke_someone_elses_token()
    {
        using var db = new TestDb();
        var created = await Tokens(db).CreateAsync(TestDb.WorkerId, NewToken());
        db.SimulateNewRequest();

        var act = () => Tokens(db).RevokeAsync(TestDb.OtherWorkerId, created.Id);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Listing_is_scoped_to_the_caller()
    {
        using var db = new TestDb();
        await Tokens(db).CreateAsync(TestDb.WorkerId, NewToken());
        db.SimulateNewRequest();

        var theirs = await Tokens(db).GetAllAsync(TestDb.OtherWorkerId);

        theirs.Should().BeEmpty();
    }

    // ── scope enforcement ────────────────────────────────────────────

    private static async Task<bool> AllowsAsync(string requiredScope, params string[] granted)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new(AppClaimTypes.UserType, nameof(UserType.Work)),
        };
        claims.AddRange(granted.Select(s => new Claim(AppClaimTypes.Scope, s)));

        var requirement = new WorkScopeRequirement(requiredScope);
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")),
            resource: null);

        await new WorkScopeHandler().HandleAsync(context);
        return context.HasSucceeded;
    }

    [Fact]
    public async Task A_read_only_token_cannot_write()
    {
        (await AllowsAsync(PatScopes.TasksWrite, PatScopes.TasksRead)).Should().BeFalse();
        (await AllowsAsync(PatScopes.TasksRead, PatScopes.TasksRead)).Should().BeTrue();
    }

    [Fact]
    public async Task A_read_write_token_can_do_both()
    {
        (await AllowsAsync(PatScopes.TasksRead, PatScopes.TasksRead, PatScopes.TasksWrite))
            .Should().BeTrue();
        (await AllowsAsync(PatScopes.TasksWrite, PatScopes.TasksRead, PatScopes.TasksWrite))
            .Should().BeTrue();
    }

    [Fact]
    public async Task A_browser_session_is_unrestricted()
    {
        // A login JWT carries no scope claims. The holder can already do anything
        // the UI offers, so an empty scope set means "not a PAT", not "no rights".
        (await AllowsAsync(PatScopes.TasksWrite)).Should().BeTrue();
        (await AllowsAsync(PatScopes.TasksRead)).Should().BeTrue();
    }
}
