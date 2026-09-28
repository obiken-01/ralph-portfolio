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
        /// How far ahead of the server a log may be dated.
        ///
        /// This was five minutes — enough slack for a device clock running fast,
        /// and nothing else. That refused ordinary entry: filling in the day's
        /// blocks in the morning means dating a log hours ahead of the moment you
        /// type it, and the form could only say "Validation failed".
        ///
        /// A day is the useful line. It covers entering any block of the working
        /// day whenever you get to it, and still catches what the guard is
        /// actually for — a clock set to the wrong week or year, or a timestamp
        /// mangled in the offline queue, either of which lands in the
        /// accomplishment report and is not noticed until DTR cutoff.
        /// </summary>
        public static readonly TimeSpan MaxForwardDating = TimeSpan.FromHours(24);

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
                    $"loggedAt must be within the last {MaxBackdating.Days} days and no more than " +
                    $"{MaxForwardDating.TotalHours:0} hours ahead. Check the device clock.");

            // Guid.Empty is what an uninitialised client field serialises to. It
            // would be accepted as a real key, and then the second such request
            // from anyone would collide with the first.
            RuleFor(x => x.PublicId)
                .NotEqual(Guid.Empty)
                .When(x => x.PublicId.HasValue)
                .WithMessage("publicId must be a real GUID, not an empty one.");
        }

        internal static bool BeWithinClockTolerance(DateTime loggedAt) =>
            BeWithinForwardLimit(loggedAt) && AsUtc(loggedAt) >= DateTime.UtcNow.Subtract(MaxBackdating);

        internal static bool BeWithinForwardLimit(DateTime loggedAt) =>
            AsUtc(loggedAt) <= DateTime.UtcNow.Add(MaxForwardDating);

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

            // The same forward limit as create, but no backdating limit.
            //
            // On create the ninety-day window guards against a device inventing
            // an entry at a nonsense date. An update cannot do that: it targets a
            // record the user deliberately opened, and the frontend resends
            // loggedAt on every edit — so applying the window here would make a
            // log older than ninety days permanently uneditable, typo and all,
            // for no integrity gain. Forward drift is still caught.
            RuleFor(x => x.LoggedAt)
                .Must(CreateTimeLogDtoValidator.BeWithinForwardLimit)
                .WithMessage(
                    $"loggedAt cannot be more than {CreateTimeLogDtoValidator.MaxForwardDating.TotalHours:0} hours ahead. " +
                    "Check the device clock.");
        }
    }
}
