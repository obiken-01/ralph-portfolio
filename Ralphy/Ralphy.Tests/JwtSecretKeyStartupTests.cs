using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ralphy.Infrastructure.Extensions;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The signing key used to live in appsettings.json, in a public repo. It is gone
/// from there now, so a deploy that forgets to set Jwt__SecretKey has to fail at
/// startup rather than boot with a blank or guessable key.
/// </summary>
public class JwtSecretKeyStartupTests
{
    private static Action Register(string? secretKey)
    {
        var settings = new Dictionary<string, string?>();
        if (secretKey is not null) settings["Jwt:SecretKey"] = secretKey;

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        return () => new ServiceCollection().AddInfrastructure(configuration);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("too-short")]
    public void Startup_refuses_a_missing_or_short_signing_key(string? secretKey)
    {
        Register(secretKey).Should().Throw<InvalidOperationException>()
            .WithMessage("*Jwt*SecretKey*");
    }
}
