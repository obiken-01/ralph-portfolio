using Ralphy.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Domain.Interfaces.Repositories
{
    public interface IPostRepository : IBaseRepository<Post>
    {
        Task<IEnumerable<Post>> GetAllPublishedAsync();
        Task<Post?> GetPostWithDetailsAsync(int id);
        Task<IEnumerable<Post>> GetByTripIdAsync(int tripId);
        Task IncrementViewCountAsync(int postId);
    }
}
