using FluentValidation;
using Ralphy.Application.DTOs.Work.Projects;

namespace Ralphy.Application.Validators.Work
{
    public class CreateProjectDtoValidator : AbstractValidator<CreateProjectDto>
    {
        internal const string HexPattern = "^#([0-9a-fA-F]{6})$";

        public CreateProjectDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("A project needs a name.")
                .MaximumLength(150);

            RuleFor(x => x.ColorHex)
                .Matches(HexPattern)
                .When(x => !string.IsNullOrEmpty(x.ColorHex))
                .WithMessage("Colour must be a six-digit hex value like #3B82F6.");

            RuleFor(x => x.TargetEndDate)
                .GreaterThanOrEqualTo(x => x.StartDate!.Value)
                .When(x => x.StartDate.HasValue && x.TargetEndDate.HasValue)
                .WithMessage("Target end date cannot be before start date.");
        }
    }

    /// <summary>Resolved by exact type, so the derived DTO needs its own.</summary>
    public class UpdateProjectDtoValidator : AbstractValidator<UpdateProjectDto>
    {
        public UpdateProjectDtoValidator()
        {
            Include(new CreateProjectDtoValidator());

            RuleFor(x => x.ActualEndDate)
                .GreaterThanOrEqualTo(x => x.StartDate!.Value)
                .When(x => x.StartDate.HasValue && x.ActualEndDate.HasValue)
                .WithMessage("Actual end date cannot be before start date.");
        }
    }
}
