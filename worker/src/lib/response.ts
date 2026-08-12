import type { ApiErrorResponse } from '../../../shared/types';

export const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {})
    }
  });

export const errorResponse = (status: number, error: string, details?: string) =>
  jsonResponse({ error, details } satisfies ApiErrorResponse, { status });

export const corsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
};

export const corsResponse = (request: Request, body: unknown, init: ResponseInit = {}) =>
  jsonResponse(body, {
    ...init,
    headers: {
      ...corsHeaders(request),
      ...(init.headers ?? {})
    }
  });

export const withCors = (request: Request, response: Response) => {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};
