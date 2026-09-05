using FluentValidation;
using Ralphy.Application.DTOs.Work.WorkItems;

namespace Ralphy.Application.Validators.Work
{
    public class CreateWorkItemDtoValidator : AbstractValidator<CreateWorkItemDto>
    {
        public CreateWorkItemDtoValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("A task needs a title.")
                .MaximumLength(200);

            RuleFor(x => x.Summary).MaximumLength(280);

            // Guid.Empty is what an uninitialised client field serialises to.
            // Accepted as a real key it would collide with the next such request
            // from anyone.
            RuleFor(x => x.PublicId)
                .NotEqual(Guid.Empty)
                .When(x => x.PublicId.HasValue)
                .WithMessage("publicId must be a real GUID, not an empty one.");

            RuleFor(x => x.DueDate)
                .GreaterThanOrEqualTo(x => x.StartDate!.Value)
                .When(x => x.StartDate.HasValue && x.DueDate.HasValue)
                .WithMessage("Due date cannot be before start date.");
        }
    }

    /// <summary>
    /// UpdateWorkItemDto derives from CreateWorkItemDto, but FluentValidation
    /// resolves validators by exact type — without this the update endpoint would
    /// silently accept anything.
    /// </summary>
    public class UpdateWorkItemDtoValidator : AbstractValidator<UpdateWorkItemDto>
    {
        public UpdateWorkItemDtoValidator()
        {
            Include(new CreateWorkItemDtoValidator());
        }
    }
}
