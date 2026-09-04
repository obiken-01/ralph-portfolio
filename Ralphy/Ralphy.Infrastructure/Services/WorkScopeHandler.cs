using Microsoft.AspNetCore.Authorization;
using Ralphy.Domain.Constants;

namespace Ralphy.Infrastructure.Services
{
    public class WorkScopeRequirement : IAuthorizationRequirement
    {
        public string Scope { get; }

        public WorkScopeRequirement(string scope) => Scope = scope;
    }

    /// <summary>
    /// Enforces PAT scopes without restricting browser sessions.
    ///
    /// A JWT from a login carries no scope claims and is unrestricted — the person
    /// holding it can already do anything the UI offers. A PAT always carries at
    /// least one scope (the service refuses to issue one without), so an empty
    /// scope set means "not a PAT" rather than "a PAT with no permissions".
    /// That asymmetry is what lets a read-only token be handed to Claude Desktop
    /// while the same endpoints stay fully usable from the browser.
    /// </summary>
    public class WorkScopeHandler : AuthorizationHandler<WorkScopeRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context, WorkScopeRequirement requirement)
        {
            var scopes = context.User
                .FindAll(AppClaimTypes.Scope)
                .Select(c => c.Value)
                .ToList();

            if (scopes.Count == 0 ||
                scopes.Contains(requirement.Scope, StringComparer.OrdinalIgnoreCase))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
