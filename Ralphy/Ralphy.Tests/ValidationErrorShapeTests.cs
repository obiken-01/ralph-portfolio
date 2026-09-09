using FluentAssertions;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Ralphy.Api.Filters;
using Ralphy.Application.Common;
using Ralphy.Application.DTOs.Work;
using Ralphy.Application.Validators.Work;
using System.Text.Json;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// A 400 has to say which field it is about.
///
/// The rules themselves were never the problem — a future loggedAt was refused
/// exactly as intended. What cost a day was the response: "Validation failed"
/// and nothing else, so the form could not point at the input the server
/// objected to and the client was left guessing between a timestamp rule and a
/// property it had just started sending.
/// </summary>
public class ValidationErrorShapeTests
{
    /// <summary>Runs the filter and reports whether the action was reached.</summary>
    private static async Task<(ActionExecutingContext Context, bool ReachedAction)> RunFilterAsync<T>(
        T dto, IValidator<T> validator) where T : class
    {
        var services = new ServiceCollection()
            .AddSingleton(validator)
            .BuildServiceProvider();

        var context = new ActionExecutingContext(
            new ActionContext(
                new DefaultHttpContext { RequestServices = services },
                new RouteData(),
                new ActionDescriptor()),
            new List<IFilterMetadata>(),
            new Dictionary<string, object?> { ["request"] = dto },
            controller: null!);

        var reached = false;

        await new ValidateDtoAttribute().OnActionExecutionAsync(context, () =>
        {
            reached = true;
            return Task.FromResult<ActionExecutedContext>(null!);
        });

        return (context, reached);
    }

    private static async Task<ApiResponse<object>> RejectAsync<T>(
        T dto, IValidator<T> validator) where T : class
    {
        var (context, _) = await RunFilterAsync(dto, validator);

        context.Result.Should().BeOfType<BadRequestObjectResult>(
            "the DTO under test is invalid on purpose");

        return (ApiResponse<object>)((BadRequestObjectResult)context.Result!).Value!;
    }

    private static CreateTimeLogDto Log() => new()
    {
        TaskDescription = "Continue implementation of the AIP rework",
        Duration = 3m,
        LoggedAt = DateTime.UtcNow.AddHours(-1),
    };

    [Fact]
    public async Task A_rejected_timestamp_names_the_field_that_was_rejected()
    {
        var dto = Log();
        dto.LoggedAt = DateTime.UtcNow.AddDays(30);

        var body = await RejectAsync(dto, new CreateTimeLogDtoValidator());

        body.Success.Should().BeFalse();
        body.Message.Should().Be("Validation failed");
        body.Errors.Should().ContainSingle()
            .Which.Field.Should().Be("LoggedAt");
    }

    [Fact]
    public async Task The_message_survives_alongside_the_field()
    {
        var dto = Log();
        dto.Duration = 0m;

        var body = await RejectAsync(dto, new CreateTimeLogDtoValidator());

        var error = body.Errors.Should().ContainSingle().Subject;
        error.Field.Should().Be("Duration");
        error.Message.Should().Be("Duration must be greater than zero.");
    }

    [Fact]
    public async Task Every_broken_rule_is_reported_not_just_the_first()
    {
        var dto = Log();
        dto.TaskDescription = string.Empty;
        dto.Duration = 99m;

        var body = await RejectAsync(dto, new CreateTimeLogDtoValidator());

        // A form that fixes one field per round trip is barely better than one
        // that guesses.
        body.Errors!.Select(e => e.Field)
            .Should().BeEquivalentTo(new[] { "TaskDescription", "Duration" });
    }

    [Fact]
    public async Task An_update_rejection_names_its_field_too()
    {
        var body = await RejectAsync(
            new UpdateTimeLogDto
            {
                TaskDescription = "Corrected",
                Duration = 1m,
                LoggedAt = DateTime.UtcNow.AddDays(30),
            },
            new UpdateTimeLogDtoValidator());

        body.Errors.Should().ContainSingle().Which.Field.Should().Be("LoggedAt");
    }

    [Fact]
    public async Task The_body_on_the_wire_is_the_shape_the_client_parses()
    {
        var dto = Log();
        dto.LoggedAt = DateTime.UtcNow.AddDays(30);

        var body = await RejectAsync(dto, new CreateTimeLogDtoValidator());

        // JsonSerializerDefaults.Web is what MVC serialises action results with,
        // so this is the text the frontend actually receives. Asserted literally
        // because the contract is with a client in another repository that
        // cannot be changed in the same commit as this one.
        using var json = JsonDocument.Parse(
            JsonSerializer.Serialize(body, new JsonSerializerOptions(JsonSerializerDefaults.Web)));

        var root = json.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeFalse();
        root.GetProperty("message").GetString().Should().Be("Validation failed");

        var error = root.GetProperty("errors").EnumerateArray().Single();
        error.GetProperty("field").GetString().Should().Be("LoggedAt");
        error.GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void A_field_name_is_never_an_empty_string()
    {
        // FluentValidation and ModelState both use "" for a rule that belongs to
        // no single property. Serialised as-is the client gets a field name it
        // cannot match to any input, which is worse than none.
        new ApiError(string.Empty, "something broke").Field.Should().BeNull();
        new ApiError("   ", "something broke").Field.Should().BeNull();
    }

    [Fact]
    public async Task A_valid_publicId_is_not_reported_as_a_problem()
    {
        var dto = Log();
        dto.PublicId = Guid.NewGuid();

        var (context, reachedAction) = await RunFilterAsync(dto, new CreateTimeLogDtoValidator());

        // The spec's first suspect. An id the client generated for its outbox is
        // an ordinary part of a create, not a reason to refuse one.
        reachedAction.Should().BeTrue();
        context.Result.Should().BeNull();
    }

    [Fact]
    public async Task An_empty_publicId_is_refused_and_says_so()
    {
        var dto = Log();
        dto.PublicId = Guid.Empty;

        var body = await RejectAsync(dto, new CreateTimeLogDtoValidator());

        body.Errors.Should().ContainSingle().Which.Field.Should().Be("PublicId");
    }
}
