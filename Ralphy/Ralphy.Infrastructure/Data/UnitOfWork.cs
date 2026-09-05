using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Exceptions;
using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Interfaces.Repositories;
using Ralphy.Domain.Interfaces.Repositories.Work;
using Ralphy.Infrastructure.Data.Repositories;
using Ralphy.Infrastructure.Data.Repositories.Work;

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
        public IWorkUserRepository WorkUsers { get; }
        public ITimeLogRepository TimeLogs { get; }
        public IProjectRepository Projects { get; }
        public IWorkItemRepository WorkItems { get; }
        public ILabelRepository Labels { get; }
        public IPersonalAccessTokenRepository PersonalAccessTokens { get; }

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
            WorkUsers = new WorkUserRepository(context);
            TimeLogs = new TimeLogRepository(context);
            Projects = new ProjectRepository(context);
            WorkItems = new WorkItemRepository(context);
            Labels = new LabelRepository(context);
            PersonalAccessTokens = new PersonalAccessTokenRepository(context);
        }

        public async Task<int> SaveChangesAsync()
        {
            try
            {
                return await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                // Translated here rather than in the service: Ralphy.Application
                // references neither EF Core nor Npgsql, and should not start.
                throw new DuplicateKeyException(
                    "A record with that identity already exists.", ex);
            }
        }

        /// <summary>
        /// 23505 is the SQL standard code for a unique violation. Matched on the
        /// string rather than on PostgresException so the SQLite test harness,
        /// which reports the same class of failure differently, still works.
        /// </summary>
        private static bool IsUniqueViolation(DbUpdateException ex)
        {
            for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
            {
                var sqlState = inner.GetType().GetProperty("SqlState")?.GetValue(inner) as string;
                if (sqlState == "23505")
                    return true;

                // SqliteException carries no SqlState; the test harness relies on
                // this arm to exercise the same path Postgres reaches above.
                if (inner.GetType().Name == "SqliteException" &&
                    inner.Message.Contains("UNIQUE constraint failed", StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        public void Dispose() =>
            _context.Dispose();
    }
}