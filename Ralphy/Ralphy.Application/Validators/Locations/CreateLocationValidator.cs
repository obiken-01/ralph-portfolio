using FluentValidation;
using Ralphy.Application.DTOs.Locations;

namespace Ralphy.Application.Validators.Locations
{
    public class CreateLocationValidator : AbstractValidator<CreateLocationDto>
    {
        public CreateLocationValidator()
        {
            RuleFor(x => x.PlaceName)
                .NotEmpty().WithMessage("Place name is required")
                .MaximumLength(100).WithMessage("Place name cannot exceed 100 characters");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90, 90)
                .WithMessage("Latitude must be between -90 and 90");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180, 180)
                .WithMessage("Longitude must be between -180 and 180");

            RuleFor(x => x.TripId)
                .GreaterThan(0).WithMessage("Valid Trip ID is required");

            RuleFor(x => x.Description)
                .MaximumLength(500)
                .WithMessage("Description cannot exceed 500 characters")
                .When(x => !string.IsNullOrEmpty(x.Description));
        }
    }
}