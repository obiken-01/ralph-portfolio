using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Ralphy.Api.Middleware;
using Ralphy.Application.DTOs.Auth;
using Ralphy.Application.Services.Work;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Exceptions;
using Ralphy.Domain.Interfaces;
using Ralphy.Infrastructure.Data;
using System.Text.Json;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// An offline client has to tell "the network is unreachable" apart from "the
/// session is genuinely over". It does that from the refresh endpoint's status
/// code, so the two failure modes must never share one.
///
/// A refresh that answers 401 to an unrelated internal fault logs people out of
/// a working session — and does it precisely when the server is already having a
/// bad day, so the logout looks like a coincidence rather than a bug.
/// </summary>
public class OfflineAuthContractTests
{
    // ── refresh: which failures mean "logged out" ────────────────────

    private static WorkAuthService Auth(TestDb db, IUnitOfWork? uow = null) =>
        new(uow ?? new UnitOfWork(db.Context),
            Mock.Of<ITokenService>(),
            Mock.Of<IPasswordService>());

    private static RefreshToken SeedToken(
        TestDb db,
        UserType userType = UserType.Work,
        DateTime? expiresAt = null,
        DateTime? revokedAt = null)
    {
        var token = new RefreshToken
        {
            Token = Guid.NewGuid().ToString(),
            ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(7),
            RevokedAt = revokedAt,
            UserId = TestDb.WorkerId,
            UserType = userType,
        };

        db.Context.RefreshTokens.Add(token);
        db.Context.SaveChanges();
        return token;
    }

    [Fact]
    public async Task An_unknown_refresh_token_is_unauthorized()
    {
        using var db = new TestDb();

        var act = async () => await Auth(db).RefreshTokenAsync(
            new RefreshTokenRequestDto { RefreshToken = "never issued" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task A_revoked_refresh_token_is_unauthorized()
    {
        using var db = new TestDb();
        var token = SeedToken(db, revokedAt: DateTime.UtcNow.AddMinutes(-5));
        db.SimulateNewRequest();

        var act = async () => await Auth(db).RefreshTokenAsync(
            new RefreshTokenRequestDto { RefreshToken = token.Token });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task An_expired_refresh_token_is_unauthorized()
    {
        using var db = new TestDb();
        var token = SeedToken(db, expiresAt: DateTime.UtcNow.AddDays(-1));
        db.SimulateNewRequest();

        var act = async () => await Auth(db).RefreshTokenAsync(
            new RefreshTokenRequestDto { RefreshToken = token.Token });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task A_blog_refresh_token_cannot_refresh_a_work_session()
    {
        using var db = new TestDb();
        var token = SeedToken(db, userType: UserType.Ralphy);
        db.SimulateNewRequest();

        var act = async () => await Auth(db).RefreshTokenAsync(
            new RefreshTokenRequestDto { RefreshToken = token.Token });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task An_infrastructure_fault_does_not_masquerade_as_a_dead_session()
    {
        using var db = new TestDb();

        // The database is unreachable. That is a 5xx the client retries while
        // keeping its session — never a 401, which would log the user out of a
        // session that is perfectly valid.
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.RefreshTokens.GetByTokenAsync(It.IsAny<string>()))
            .ThrowsAsync(new TimeoutException("connection pool exhausted"));

        var act = async () => await Auth(db, uow.Object).RefreshTokenAsync(
            new RefreshTokenRequestDto { RefreshToken = "valid enough" });

        await act.Should().NotThrowAsync<UnauthorizedAccessException>();
        await act.Should().ThrowAsync<TimeoutException>();
    }

    // ── the middleware that turns those into status codes ────────────

    private static async Task<(int Status, JsonElement Body)> Run(Exception thrown)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var middleware = new ExceptionMiddleware(
            _ => throw thrown,
            Mock.Of<Microsoft.Extensions.Logging.ILogger<ExceptionMiddleware>>());

        await middleware.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var json = await new StreamReader(context.Response.Body).ReadToEndAsync();

        return (context.Response.StatusCode, JsonDocument.Parse(json).RootElement);
    }

    [Fact]
    public async Task A_dead_session_is_401()
    {
        var (status, _) = await Run(new UnauthorizedAccessException("Invalid refresh token"));
        status.Should().Be(401);
    }

    [Fact]
    public async Task An_unexpected_fault_is_500_not_401()
    {
        var (status, _) = await Run(new TimeoutException("connection pool exhausted"));

        // The distinction the whole offline auth story rests on.
        status.Should().Be(500);
    }

    [Fact]
    public async Task A_missing_record_is_404()
    {
        var (status, _) = await Run(new KeyNotFoundException("Work item not found"));

        // The outbox discards a 404 rather than retrying it forever, so this must
        // not fall through to the 500 arm.
        status.Should().Be(404);
    }

    [Fact]
    public async Task A_stale_edit_is_409_carrying_the_current_state()
    {
        var (status, body) = await Run(new ConflictException(
            "This task was changed since you last saw it.",
            new { Title = "server version" }));

        status.Should().Be(409);
        body.GetProperty("data").GetProperty("title").GetString()
            .Should().Be("server version");
    }

    [Fact]
    public async Task A_taken_identifier_is_409_not_500()
    {
        var (status, _) = await Run(new DuplicateKeyException(
            "duplicate", new InvalidOperationException()));

        // Reaching the middleware means the services could not resolve it as a
        // replay, so the GUID belongs to another account. A collision, not a
        // server error.
        status.Should().Be(409);
    }

    [Fact]
    public async Task A_conflict_without_a_payload_still_serialises()
    {
        var (status, body) = await Run(new ConflictException("no payload"));

        status.Should().Be(409);
        body.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Null);
    }
}
