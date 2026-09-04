using Ralphy.Domain.Interfaces.Repositories;
using Ralphy.Domain.Interfaces.Repositories.Work;

namespace Ralphy.Domain.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IUserRepository Users { get; }
        IPostRepository Posts { get; }
        IPhotoRepository Photos { get; }
        ICommentRepository Comments { get; }
        ILocationRepository Locations { get; }

        IRefreshTokenRepository RefreshTokens { get; }

        ITagRepository Tags { get; }
        IPostTagRepository PostTags { get; }

        IAboutProfileRepository AboutProfiles { get; }
        IWorkExperienceRepository WorkExperiences { get; }
        ISkillRepository Skills { get; }
        IContactMessageRepository ContactMessages { get; }

        // Work repositories (v1.3 as Timekeeping, renamed in the Work module rollout)
        IWorkUserRepository WorkUsers { get; }
        ITimeLogRepository TimeLogs { get; }
        IProjectRepository Projects { get; }
        IWorkItemRepository WorkItems { get; }
        ILabelRepository Labels { get; }
        IPersonalAccessTokenRepository PersonalAccessTokens { get; }

        Task<int> SaveChangesAsync();
    }
}