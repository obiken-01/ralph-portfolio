namespace Ralphy.Application.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public int StatusCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public IEnumerable<string>? Errors { get; set; }

        // ── Static factory methods ────────────────────────────────

        public static ApiResponse<T> Ok(T data, string message = "OK") =>
            new()
            {
                Success = true,
                StatusCode = 200,
                Message = message,
                Data = data
            };

        public static ApiResponse<T> Created(T data, string message = "Created") =>
            new()
            {
                Success = true,
                StatusCode = 201,
                Message = message,
                Data = data
            };

        public static ApiResponse<T> Fail(
            int statusCode,
            string message,
            IEnumerable<string>? errors = null) =>
            new()
            {
                Success = false,
                StatusCode = statusCode,
                Message = message,
                Data = default,
                Errors = errors
            };
    }

    // Non-generic version for responses without data
    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse OkMessage(string message = "OK") =>
            new()
            {
                Success = true,
                StatusCode = 200,
                Message = message,
                Data = null
            };
    }
}