using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Ralphy.Application.Common;

namespace Ralphy.Api.Filters
{
    /// <summary>
    /// Runs any registered FluentValidation validator against the action's body
    /// arguments before the action executes.
    ///
    /// This exists because validators were registered but never invoked. The
    /// project references FluentValidation.DependencyInjectionExtensions, which
    /// only puts validators in the container — auto-validation needs
    /// FluentValidation.AspNetCore, which is not referenced. The blog controllers
    /// therefore call ValidateAsync by hand, and the Work controllers, added
    /// later, do not. CreateWorkItemDtoValidator has never run.
    ///
    /// Deliberately applied per-controller rather than globally: switching
    /// validation on for every endpoint at once would start rejecting requests
    /// that the blog surface currently accepts, which is a much larger change
    /// than this one. The blog controllers keep their manual calls.
    ///
    /// The error shape matches those manual calls exactly, so a client cannot
    /// tell which path produced a 400.
    /// </summary>
    public class ValidateDtoAttribute : ActionFilterAttribute
    {
        public override async Task OnActionExecutionAsync(
            ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var services = context.HttpContext.RequestServices;

            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument is null)
                    continue;

                var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());

                // No validator for this type is the normal case — query DTOs,
                // route ids, anything without rules. Not an error.
                if (services.GetService(validatorType) is not IValidator validator)
                    continue;

                var validationContext = new ValidationContext<object>(argument);
                var result = await validator.ValidateAsync(validationContext);

                if (result.IsValid)
                    continue;

                context.Result = new BadRequestObjectResult(
                    ApiResponse<object>.Fail(
                        400,
                        "Validation failed",
                        result.Errors.Select(e => e.ErrorMessage)));
                return;
            }

            await next();
        }
    }
}
