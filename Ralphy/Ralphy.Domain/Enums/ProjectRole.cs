namespace Ralphy.Domain.Enums
{
    /// <summary>
    /// Ordered by privilege, so authorisation checks can read as `role >= Member`.
    /// Adding a level in the middle would renumber the ones above it — append instead.
    /// </summary>
    public enum ProjectRole
    {
        Viewer = 0,
        Member = 1,
        Admin = 2
    }
}
