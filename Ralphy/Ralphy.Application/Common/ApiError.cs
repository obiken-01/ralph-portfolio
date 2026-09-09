using System.Text.Json.Serialization;

namespace Ralphy.Application.Common
{
    /// <summary>
    /// One validation failure, named by the property that produced it.
    ///
    /// A 400 used to carry a bare list of messages. That reads fine in a log and
    /// is useless to a form: the client saw "Validation failed", could not tell
    /// which input the server objected to, and had to guess — which is how a
    /// rejected loggedAt cost a day of back-and-forth instead of showing up
    /// under the field that caused it.
    /// </summary>
    public class ApiError
    {
        /// <summary>
        /// The offending property, as the validator names it — "LoggedAt", not
        /// "loggedAt". Null for a rule that spans the whole request rather than
        /// one field; the client falls back to showing the message alone.
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Field { get; set; }

        public string Message { get; set; } = string.Empty;

        public ApiError() { }

        public ApiError(string? field, string message)
        {
            // FluentValidation and ModelState both use an empty string, not null,
            // for an error that belongs to no single property. Serialising that
            // would hand the client a field name it cannot match to any input.
            Field = string.IsNullOrWhiteSpace(field) ? null : field;
            Message = message;
        }
    }
}
