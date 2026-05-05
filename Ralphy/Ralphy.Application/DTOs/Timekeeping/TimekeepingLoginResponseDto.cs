using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ralphy.Application.DTOs.Timekeeping
{
    public class TimekeepingLoginResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public TimekeepingUserDto User { get; set; } = null!;
    }
}
