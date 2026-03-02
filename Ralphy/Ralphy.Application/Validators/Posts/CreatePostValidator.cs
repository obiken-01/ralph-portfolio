using FluentValidation;
using Ralphy.Application.DTOs.Posts;

namespace Ralphy.Application.Validators.Posts
{
    public class CreatePostValidator : AbstractValidator<CreatePostDto>
    {
        public CreatePostValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Title is required")
                .MaximumLength(200).WithMessage("Title cannot exceed 200 characters");

            RuleFor(x => x.Content)
                .NotEmpty().WithMessage("Content is required");

            RuleFor(x => x.TripId)
                .GreaterThan(0).WithMessage("Valid Trip ID is required");

            RuleFor(x => x.VideoUrl)
                .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
                .When(x => !string.IsNullOrEmpty(x.VideoUrl))
                .WithMessage("Invalid video URL format");
        }
    }
}