namespace Ralphy.Domain.Exceptions
{
    /// <summary>
    /// A write was refused because the record moved on since the client last saw
    /// it — the offline-sync case.
    ///
    /// Carries the current server state so the response can show a comparison
    /// rather than a bare failure. A client that only gets "conflict" has no way
    /// to resolve one, and will either drop the edit or retry it forever.
    /// </summary>
    public class ConflictException : Exception
    {
        public ConflictException(string message, object? current = null)
            : base(message)
        {
            Current = current;
        }

        /// <summary>The record as the server currently holds it. May be null.</summary>
        public object? Current { get; }
    }
}
