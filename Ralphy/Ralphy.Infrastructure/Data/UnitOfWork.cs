using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Interfaces.Repositories;
using Ralphy.Infrastructure.Data.Repositories;

namespace Ralphy.Infrastructure.Data
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _context;

        public IUserRepository Users { get; }
        public IPostRepository Posts { get; }
        public IPhotoRepository Photos { get; }
        public ICommentRepository Comments { get; }
        public ILocationRepository Locations { get; }
        public IRefreshTokenRepository RefreshTokens { get; }
        public ITagRepository Tags { get; }
        public IPostTagRepository PostTags { get; }
        public IAboutProfileRepository AboutProfiles { get; }
        public IWorkExperienceRepository WorkExperiences { get; }
        public ISkillRepository Skills { get; }
        public IContactMessageRepository ContactMessages { get; }
        public ITimekeepingUserRepository TimekeepingUsers { get; }
        public ITimeLogRepository TimeLogs { get; }

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
            Users = new UserRepository(context);
            Posts = new PostRepository(context);
            Photos = new PhotoRepository(context);
            Comments = new CommentRepository(context);
            Locations = new LocationRepository(context);
            RefreshTokens = new RefreshTokenRepository(context);
            Tags = new TagRepository(context);
            PostTags = new PostTagRepository(context);
            AboutProfiles = new AboutProfileRepository(context);
            WorkExperiences = new WorkExperienceRepository(context);
            Skills = new SkillRepository(context);
            ContactMessages = new ContactMessageRepository(context);
            TimekeepingUsers = new TimekeepingUserRepository(context);
            TimeLogs = new TimeLogRepository(context);
        }

        public async Task<int> SaveChangesAsync() =>
            await _context.SaveChangesAsync();

        public void Dispose() =>
            _context.Dispose();
    }
}