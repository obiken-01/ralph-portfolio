namespace Ralphy.Application.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public int StatusCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }

        /// <summary>
        /// Field-level detail behind <see cref="Message"/>. Null when the failure
        /// has nothing to attribute — a 401, a 404, an unexpected 500.
        /// </summary>
        public IEnumerable<ApiError>? Errors { get; set; }

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
            IEnumerable<ApiError>? errors = null) =>
            new()
            {
                Success = false,
                StatusCode = statusCode,
                Message = message,
                Data = default,
                Errors = errors
            };

        /// <summary>
        /// For failures that genuinely have no field to point at — a rate-limit
        /// refusal, say. Prefer the overload above wherever the property name is
        /// known; a message with no field is what the client could not act on.
        /// </summary>
        public static ApiResponse<T> Fail(
            int statusCode,
            string message,
            IEnumerable<string> errors) =>
            Fail(statusCode, message, errors.Select(e => new ApiError(null, e)));
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