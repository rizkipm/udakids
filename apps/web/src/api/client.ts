import { API_URL } from '../config/app';

export type ApiIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: ApiIssue[] = [],
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

/** Panggil API NestJS. Melempar ApiError (status 0 = tidak tersambung). */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(opts.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(opts.token && { Authorization: `Bearer ${opts.token}` }),
      },
      ...(opts.body !== undefined && { body: JSON.stringify(opts.body) }),
      ...(opts.signal && { signal: opts.signal }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'Tidak tersambung ke server');
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const body = (data ?? {}) as { message?: unknown; issues?: ApiIssue[] };
    const message = typeof body.message === 'string' ? body.message : res.statusText;
    throw new ApiError(res.status, message, body.issues ?? [], body as Record<string, unknown>);
  }
  return data as T;
}

/** Pesan ramah untuk ditampilkan ke orang dewasa. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Tidak tersambung ke server.';
    if (err.issues.length)
      return `${err.message}: ${err.issues.map((i) => (i.path ? `${i.path} — ${i.message}` : i.message)).join('; ')}`;
    return err.message;
  }
  return 'Terjadi kendala. Coba lagi.';
}
