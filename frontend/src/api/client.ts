import type { components } from './schema';

export type ErrorCode = components['schemas']['ErrorCode'];
/** Contract error codes plus client-side ones: NETWORK (no JSON / server unreachable), UNKNOWN (JSON that isn't the Error shape). */
export type ApiErrorCode = ErrorCode | 'NETWORK' | 'UNKNOWN';
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  fields: FieldErrors;

  constructor(status: number, code: ApiErrorCode, message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by AuthProvider whenever the token changes. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when an authenticated request comes back 401 (token expired or revoked). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
};

export async function request<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  let url = BASE_URL + path;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, v);
    const qs = params.toString();
    if (qs) url += '?' + qs;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const sentToken = authToken;
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Network request failed');
  }

  if (res.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.status, 'NETWORK', 'Response was not JSON');
  }

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: FieldErrors } } | null)?.error;
    const apiError = err?.code
      ? new ApiError(res.status, err.code as ErrorCode, err.message ?? '', err.fields ?? {})
      : new ApiError(res.status, 'UNKNOWN', `HTTP ${res.status}`);
    // Only a request that carried a token means "session expired"; a failed login is also 401.
    if (res.status === 401 && sentToken && onUnauthorized) onUnauthorized();
    throw apiError;
  }

  return data as T;
}
