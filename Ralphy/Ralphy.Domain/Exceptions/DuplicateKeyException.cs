namespace Ralphy.Domain.Exceptions
{
    /// <summary>
    /// A unique constraint rejected an insert.
    ///
    /// Exists so the application layer can react to a lost race on a
    /// client-supplied PublicId without referencing EF Core or Npgsql — the
    /// translation from the provider's exception happens in Infrastructure,
    /// where the provider is already a dependency.
    /// </summary>
    public class DuplicateKeyException : Exception
    {
        public DuplicateKeyException(string message, Exception inner)
            : base(message, inner) { }
    }
}
