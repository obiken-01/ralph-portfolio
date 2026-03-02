using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Interfaces.Repositories;
using Ralphy.Infrastructure.Data.Repositories;

namespace Ralphy.Infrastructure.Data
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _context;

        public IUserRepository Users { get; }
        public ITripRepository Trips { get; }
        public IPostRepository Posts { get; }
        public IPhotoRepository Photos { get; }
        public ICommentRepository Comments { get; }
        public ILocationRepository Locations { get; }

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
            Users = new UserRepository(context);
            Trips = new TripRepository(context);
            Posts = new PostRepository(context);
            Photos = new PhotoRepository(context);
            Comments = new CommentRepository(context);
            Locations = new LocationRepository(context);
        }

        public async Task<int> SaveChangesAsync() =>
            await _context.SaveChangesAsync();

        public void Dispose() =>
            _context.Dispose();
    }
}