using FluentValidation;
using Ralphy.Application.DTOs.Photos;

namespace Ralphy.Application.Validators.Photos
{
    public class ReorderPhotosValidator : AbstractValidator<ReorderPhotosDto>
    {
        public ReorderPhotosValidator()
        {
            RuleFor(x => x.PhotoIds)
                .NotEmpty().WithMessage("At least one photo id is required");

            RuleForEach(x => x.PhotoIds)
                .GreaterThan(0).WithMessage("Photo ids must be positive");

            // The service also checks the ids match the post exactly; this
            // catches the obviously-malformed case before the DB round-trip.
            RuleFor(x => x.PhotoIds)
                .Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("Photo ids must not repeat");
        }
    }
}
