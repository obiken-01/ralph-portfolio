using FluentValidation;
using Ralphy.Application.DTOs.Tags;

namespace Ralphy.Application.Validators.Tags
{
    public class CreateTagValidator : AbstractValidator<CreateTagDto>
    {
        public CreateTagValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Tag name is required")
                .MaximumLength(50).WithMessage("Tag name cannot exceed 50 characters")
                .Matches("^[a-zA-Z0-9-]*$")
                .WithMessage("Tag name can only contain letters, numbers and hyphens");
        }
    }
}