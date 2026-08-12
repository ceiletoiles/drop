import type { ApiErrorResponse } from '../../shared/types';
import { apiUrl } from './env';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const readApiError = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  const message = payload?.error ?? response.statusText ?? 'Request failed';
  return new ApiError(message, response.status);
};

export const apiFetch = async <T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> => {
  const headers = new Headers(init?.headers);
  if (init?.token) headers.set('Authorization', `Bearer ${init.token}`);
  if (init?.body && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return (await response.json()) as T;
};
