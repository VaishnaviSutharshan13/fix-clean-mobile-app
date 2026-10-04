import { config } from '../constants/config';

// Error thrown for non-2xx responses. `message` is user-presentable; NestJS
// validation errors (string arrays) are joined into one message.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  // Explicit token; defaults to the signed-in user's token.
  token?: string | null;
  query?: Record<string, string | number | undefined>;
};

// Set by AuthContext so feature services don't have to pass the token around.
let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setApiToken(token: string | null): void {
  currentToken = token;
}

// Called when an authenticated request is rejected with 401 (expired/invalid token).
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${config.apiBaseUrl}${path}${params ? `?${params}` : ''}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token === undefined ? currentToken : options.token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token && options.token === undefined) {
      unauthorizedHandler?.();
    }
    const raw = (data as { message?: string | string[] } | null)?.message;
    const details = Array.isArray(raw) ? raw : undefined;
    const message = details?.join('\n') ?? raw ?? `Request failed (${response.status})`;
    throw new ApiError(message as string, response.status, details);
  }

  return data as T;
}
