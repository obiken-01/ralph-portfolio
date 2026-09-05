using FluentValidation;
using Ralphy.Application.DTOs.Work;

namespace Ralphy.Application.Validators.Work
{
    /// <summary>
    /// Bounds on a time log's own claims about when and how long.
    ///
    /// These exist because of offline sync. A queued log carries whatever the
    /// device's clock said at the time, and a phone with a wrong date — or a
    /// timestamp mangled somewhere in local storage — would otherwise write
    /// nonsense straight into the accomplishment report, where nobody looks until
    /// DTR cutoff.
    /// </summary>
    public class CreateTimeLogDtoValidator : AbstractValidator<CreateTimeLogDto>
    {
        /// <summary>
        /// How far back a log may be dated. Generous on purpose: it is a guard
        /// against a broken clock, not a business rule about late filing.
        /// </summary>
        public static readonly TimeSpan MaxBackdating = TimeSpan.FromDays(90);

        /// <summary>
        /// Slack for a device clock running slightly fast. Without it a phone a
        /// minute ahead of the server cannot log the work it just did.
        /// </summary>
        public static readonly TimeSpan MaxClockSkew = TimeSpan.FromMinutes(5);

        public CreateTimeLogDtoValidator()
        {
            RuleFor(x => x.TaskDescription)
                .NotEmpty().WithMessage("A time log needs a description.")
                .MaximumLength(500);

            RuleFor(x => x.Duration)
                .GreaterThan(0).WithMessage("Duration must be greater than zero.")
                // The column is numeric(5,2); anything larger is a database error
                // surfacing as a 500 instead of a validation message.
                .LessThanOrEqualTo(24).WithMessage("A single log cannot exceed 24 hours.");

            RuleFor(x => x.LoggedAt)
                .Must(BeWithinClockTolerance)
                .WithMessage(
                    $"loggedAt must be within the last {MaxBackdating.Days} days and not in the future. " +
                    "Check the device clock.");

            // Guid.Empty is what an uninitialised client field serialises to. It
            // would be accepted as a real key, and then the second such request
            // from anyone would collide with the first.
            RuleFor(x => x.PublicId)
                .NotEqual(Guid.Empty)
                .When(x => x.PublicId.HasValue)
                .WithMessage("publicId must be a real GUID, not an empty one.");
        }

        internal static bool BeWithinClockTolerance(DateTime loggedAt) =>
            BeNotInTheFuture(loggedAt) && AsUtc(loggedAt) >= DateTime.UtcNow.Subtract(MaxBackdating);

        internal static bool BeNotInTheFuture(DateTime loggedAt) =>
            AsUtc(loggedAt) <= DateTime.UtcNow.Add(MaxClockSkew);

        private static DateTime AsUtc(DateTime value) =>
            value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
                : value.ToUniversalTime();
    }

    /// <summary>
    /// FluentValidation resolves validators by exact type, so an update DTO that
    /// does not derive from the create DTO needs its own registration or the
    /// update endpoint silently accepts anything.
    /// </summary>
    public class UpdateTimeLogDtoValidator : AbstractValidator<UpdateTimeLogDto>
    {
        public UpdateTimeLogDtoValidator()
        {
            RuleFor(x => x.TaskDescription)
                .NotEmpty().WithMessage("A time log needs a description.")
                .MaximumLength(500);

            RuleFor(x => x.Duration)
                .GreaterThan(0).WithMessage("Duration must be greater than zero.")
                .LessThanOrEqualTo(24).WithMessage("A single log cannot exceed 24 hours.");

            // No future dates, but no backdating limit either.
            //
            // On create the ninety-day window guards against a device inventing
            // an entry at a nonsense date. An update cannot do that: it targets a
            // record the user deliberately opened, and the frontend resends
            // loggedAt on every edit — so applying the window here would make a
            // log older than ninety days permanently uneditable, typo and all,
            // for no integrity gain. Forward drift is still caught.
            RuleFor(x => x.LoggedAt)
                .Must(CreateTimeLogDtoValidator.BeNotInTheFuture)
                .WithMessage("loggedAt cannot be in the future. Check the device clock.");
        }
    }
}
