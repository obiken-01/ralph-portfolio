using FluentValidation;
using Ralphy.Application.DTOs.Work.Labels;

namespace Ralphy.Application.Validators.Work
{
    public class SaveLabelDtoValidator : AbstractValidator<SaveLabelDto>
    {
        public SaveLabelDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("A label needs a name.")
                .MaximumLength(50);

            RuleFor(x => x.ColorHex)
                .NotEmpty()
                .Matches(CreateProjectDtoValidator.HexPattern)
                .WithMessage("Colour must be a six-digit hex value like #9E9E9E.");
        }
    }
}
