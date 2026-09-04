using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ralphy.Api.Controllers.Work;
using System.Reflection;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Guards the shape of the Work API surface.
///
/// A bare [Authorize] is the specific mistake this catches: it proves a token is
/// signed, not which identity space its `sub` belongs to, and that is exactly how
/// a Ralphy admin could once read a work user's time logs. A new controller added
/// to this namespace inherits none of that reasoning, so the rule is asserted
/// rather than left to review.
/// </summary>
public class WorkApiSurfaceTests
{
    private static IEnumerable<Type> WorkControllers =>
        typeof(WorkItemsController).Assembly
            .GetTypes()
            .Where(t => t.Namespace == typeof(WorkItemsController).Namespace
                     && typeof(ControllerBase).IsAssignableFrom(t)
                     && !t.IsAbstract);

    [Fact]
    public void Every_work_controller_is_discovered()
    {
        WorkControllers.Select(t => t.Name).Should().BeEquivalentTo(
            "WorkAuthController",
            "WorkTimeLogsController",
            "WorkAdminUsersController",
            "WorkItemsController",
            "WorkProjectsController",
            "WorkLabelsController",
            "WorkDirectoryController",
            "WorkAccomplishmentsController",
            "WorkTokensController");
    }

    [Fact]
    public void No_work_endpoint_is_protected_by_a_bare_Authorize()
    {
        var offenders = new List<string>();

        foreach (var controller in WorkControllers)
        {
            // WorkAuthController is the way in — login, refresh and revoke are
            // reached without a token by definition, so it is checked per-action.
            var classLevel = controller.GetCustomAttributes<AuthorizeAttribute>().ToList();

            if (classLevel.Count > 0)
            {
                if (classLevel.Any(a => string.IsNullOrEmpty(a.Policy)))
                    offenders.Add(controller.Name);

                continue;
            }

            var actionLevel = controller
                .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .SelectMany(m => m.GetCustomAttributes<AuthorizeAttribute>()
                    .Select(a => (Method: m.Name, a.Policy)));

            offenders.AddRange(actionLevel
                .Where(x => string.IsNullOrEmpty(x.Policy))
                .Select(x => $"{controller.Name}.{x.Method}"));
        }

        offenders.Should().BeEmpty(
            "a bare [Authorize] cannot tell a blog token from a Work token");
    }

    [Fact]
    public void Every_mutating_work_endpoint_demands_the_write_scope()
    {
        var offenders = new List<string>();

        foreach (var controller in WorkControllers)
        {
            // Token management is JWT-only and is asserted separately below.
            if (controller == typeof(WorkTokensController)
                || controller == typeof(WorkAdminUsersController)
                || controller == typeof(WorkAuthController))
            {
                continue;
            }

            foreach (var method in controller.GetMethods(
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            {
                var mutates =
                    method.GetCustomAttributes<HttpPostAttribute>().Any() ||
                    method.GetCustomAttributes<HttpPutAttribute>().Any() ||
                    method.GetCustomAttributes<HttpPatchAttribute>().Any() ||
                    method.GetCustomAttributes<HttpDeleteAttribute>().Any();

                if (!mutates)
                    continue;

                var policies = method.GetCustomAttributes<AuthorizeAttribute>()
                    .Select(a => a.Policy)
                    .ToList();

                if (!policies.Contains("WorkWrite"))
                    offenders.Add($"{controller.Name}.{method.Name}");
            }
        }

        offenders.Should().BeEmpty(
            "a read-only token handed to Claude Desktop must not be able to write");
    }

    [Fact]
    public void Issuing_tokens_is_reachable_only_with_a_login_session()
    {
        // If a PAT could reach this, a read-only token would simply mint itself a
        // write-scoped one and the scope split would mean nothing.
        typeof(WorkTokensController)
            .GetCustomAttributes<AuthorizeAttribute>()
            .Should().ContainSingle()
            .Which.Policy.Should().Be("WorkSession");
    }

    [Fact]
    public void The_admin_surface_requires_a_Ralphy_admin_token()
    {
        typeof(WorkAdminUsersController)
            .GetCustomAttributes<AuthorizeAttribute>()
            .Should().ContainSingle()
            .Which.Policy.Should().Be("RalphyAdmin");
    }

    [Fact]
    public void The_renamed_controllers_still_answer_on_the_deprecated_prefix()
    {
        // Railway and Netlify deploy independently; between the two the live
        // tools site is still calling /api/timekeeping/*. These aliases come out
        // only after that frontend has cut over.
        foreach (var (controller, alias) in new[]
        {
            (typeof(WorkAuthController), "api/timekeeping/auth"),
            (typeof(WorkTimeLogsController), "api/timekeeping/logs"),
            (typeof(WorkAdminUsersController), "api/timekeeping/admin/users"),
        })
        {
            controller.GetCustomAttributes<RouteAttribute>()
                .Select(r => r.Template)
                .Should().Contain(alias, $"{controller.Name} still needs its alias");
        }
    }

    [Fact]
    public void The_new_controllers_are_only_reachable_under_the_work_prefix()
    {
        foreach (var (controller, route) in new[]
        {
            (typeof(WorkItemsController), "api/work/tasks"),
            (typeof(WorkProjectsController), "api/work/projects"),
            (typeof(WorkLabelsController), "api/work/labels"),
            (typeof(WorkDirectoryController), "api/work/users"),
            (typeof(WorkAccomplishmentsController), "api/work/accomplishments"),
            (typeof(WorkTokensController), "api/work/tokens"),
        })
        {
            controller.GetCustomAttributes<RouteAttribute>()
                .Select(r => r.Template)
                .Should().BeEquivalentTo(new[] { route },
                    $"{controller.Name} is new, so it never needs a timekeeping alias");
        }
    }
}
