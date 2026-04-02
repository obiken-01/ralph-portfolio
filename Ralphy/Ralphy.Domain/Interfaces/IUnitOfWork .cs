using Ralphy.Domain.Interfaces.Repositories;

namespace Ralphy.Domain.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IUserRepository Users { get; }
        ITripRepository Trips { get; }
        IPostRepository Posts { get; }
        IPhotoRepository Photos { get; }
        ICommentRepository Comments { get; }
        ILocationRepository Locations { get; }

        IRefreshTokenRepository RefreshTokens { get; }

        ITagRepository Tags { get; }
        IPostTagRepository PostTags { get; }

        IAboutProfileRepository AboutProfiles { get; }

        Task<int> SaveChangesAsync();
    }
}