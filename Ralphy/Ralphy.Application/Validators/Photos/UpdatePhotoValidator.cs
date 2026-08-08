using FluentValidation;
using Ralphy.Application.DTOs.Photos;

namespace Ralphy.Application.Validators.Photos
{
    public class UpdatePhotoValidator : AbstractValidator<UpdatePhotoDto>
    {
        public UpdatePhotoValidator()
        {
            RuleFor(x => x.Caption)
                .MaximumLength(300)
                .WithMessage("Caption cannot exceed 300 characters")
                .When(x => !string.IsNullOrEmpty(x.Caption));
        }
    }
}
