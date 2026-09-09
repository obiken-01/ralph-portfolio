using FluentValidation.Results;

namespace Ralphy.Application.Common
{
    /// <summary>
    /// Turns FluentValidation failures into the wire shape.
    ///
    /// Every 400 in the API goes through here so that the manual
    /// ValidateAsync calls on the blog controllers and the ValidateDto filter on
    /// the Work controllers cannot drift apart — a client must not be able to
    /// tell which path rejected it.
    /// </summary>
    public static class ValidationErrorExtensions
    {
        public static IEnumerable<ApiError> ToApiErrors(this IEnumerable<ValidationFailure> failures) =>
            failures.Select(f => new ApiError(f.PropertyName, f.ErrorMessage)).ToList();
    }
}
