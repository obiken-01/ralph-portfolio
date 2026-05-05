using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Domain.Entities
{
    public class TimekeepingUser : BaseEntity
    {
        public Guid PublicId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;

        public ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
    }
}
