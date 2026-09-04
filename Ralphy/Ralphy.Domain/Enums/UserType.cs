namespace Ralphy.Domain.Enums
{
    /// <summary>
    /// Which identity space a token or refresh token belongs to. Persisted as an
    /// int, so the member rename Timekeeping → Work in the Work module rollout
    /// deliberately kept the value 1 — no RefreshTokens data change.
    /// </summary>
    public enum UserType
    {
        Ralphy = 0,
        Work = 1
    }
}
