/**
 * Thin HTTP client for the Ralphy Work API.
 *
 * Every response is an ApiResponse<T> envelope: { success, statusCode, message,
 * data, errors }. A failure can arrive either as a non-2xx status or as a 2xx
 * carrying success:false, so both are unwrapped into a thrown Error here rather
 * than leaving each tool to check.
 */

// The `ralphy-production` host routes through Fastly and 405s on OPTIONS
// preflight. This one does not — do not "modernise" it.
const DEFAULT_BASE_URL = 'https://ralph-portfolio-production.up.railway.app';

export class WorkApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = 'WorkApiError';
    this.status = status;
    this.errors = errors;
  }
}

export class WorkApiClient {
  constructor({ baseUrl, token } = {}) {
    this.baseUrl = (baseUrl || process.env.RALPHY_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.token = token || process.env.RALPHY_PAT || '';

    if (!this.token) {
      throw new Error(
        'No personal access token. Set RALPHY_PAT to a token from /admin — ' +
          'Work → Tokens, or POST /api/work/tokens.',
      );
    }

    if (!this.token.startsWith('rpat_')) {
      throw new Error('RALPHY_PAT does not look like a Work token (expected an rpat_ prefix).');
    }
  }

  async request(method, path, { query, body } = {}) {
    const url = new URL(`${this.baseUrl}/api/work${path}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (cause) {
      throw new WorkApiError(`Could not reach ${this.baseUrl}: ${cause.message}`);
    }

    // 401 and 403 are the two a misconfigured token produces, and the generic
    // message for either is unhelpful when you are three layers deep in a chat.
    if (response.status === 401) {
      throw new WorkApiError(
        'The token was rejected. It may be revoked, expired, or for another environment.',
        { status: 401 },
      );
    }

    if (response.status === 403) {
      throw new WorkApiError(
        `This token lacks the scope for ${method} ${path}. ` +
          'Read-only tokens carry tasks:read; writing needs tasks:write.',
        { status: 403 },
      );
    }

    const text = await response.text();
    let payload;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new WorkApiError(
        `Unexpected non-JSON response (HTTP ${response.status}) from ${url.pathname}.`,
        { status: response.status },
      );
    }

    if (!response.ok || payload?.success === false) {
      throw new WorkApiError(payload?.message || `HTTP ${response.status}`, {
        status: response.status,
        errors: payload?.errors,
      });
    }

    // Unwrap the envelope; endpoints returning no data still report success.
    return payload && Object.hasOwn(payload, 'data') ? payload.data : payload;
  }

  get(path, query) {
    return this.request('GET', path, { query });
  }

  post(path, body) {
    return this.request('POST', path, { body });
  }

  put(path, body) {
    return this.request('PUT', path, { body });
  }

  patch(path, body) {
    return this.request('PATCH', path, { body });
  }
}
