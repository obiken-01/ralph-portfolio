using FluentValidation;
using Ralphy.Application.DTOs.Posts;

namespace Ralphy.Application.Validators.Posts
{
    public class UpdatePostValidator : AbstractValidator<UpdatePostDto>
    {
        public UpdatePostValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Title is required")
                .MaximumLength(200).WithMessage("Title cannot exceed 200 characters");

            // Content is optional as of v2.0.

            RuleFor(x => x.LocationId)
                .GreaterThan(0).WithMessage("A location is required");

            RuleFor(x => x.VideoUrl)
                .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
                .When(x => !string.IsNullOrEmpty(x.VideoUrl))
                .WithMessage("Invalid video URL format");
        }
    }
}
