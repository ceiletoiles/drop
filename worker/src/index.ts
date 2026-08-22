import type { Env } from './types';
import { getAuthenticatedUser } from './lib/auth';
import { corsResponse, errorResponse, withCors } from './lib/response';
import { createText, deleteItem, downloadItemFile, listItems, updateText, uploadItem } from './lib/items';
import { listActivities, recordActivity } from './lib/activity';
import { MAX_SEARCH_CHARS } from '../../shared/constants';

const readBody = async (request: Request) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json() as Promise<Record<string, unknown>>;
  }
  return {};
};

const notFound = () => errorResponse(404, 'Not found.');

const handleItems = async (request: Request, env: Env, userId: string) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'GET' && url.pathname === '/api/items') {
    const query = (url.searchParams.get('query') ?? '').slice(0, MAX_SEARCH_CHARS);
    const items = await listItems(env, userId, query);
    return corsResponse(request, { items });
  }

  if (method === 'GET' && url.pathname === '/api/activity') {
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
    const activities = await listActivities(env, userId, Number.isFinite(limit) ? limit : 20);
    return corsResponse(request, { activities });
  }

  if (method === 'POST' && url.pathname === '/api/activity') {
    const body = await readBody(request);
    const action = body.action;
    if (action !== 'sign_in' && action !== 'sign_out') {
      return errorResponse(400, 'Invalid activity action.');
    }

    await recordActivity(env, {
      userId,
      action,
      title: action === 'sign_in' ? 'Signed in' : 'Signed out'
    });

    return corsResponse(request, { ok: true }, { status: 201 });
  }

  if (method === 'POST' && url.pathname === '/api/items/text') {
    const body = await readBody(request);
    const item = await createText(env, userId, {
      title: typeof body.title === 'string' ? body.title : '',
      content: typeof body.content === 'string' ? body.content : ''
    });
    return corsResponse(request, { item }, { status: 201 });
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/items/text/')) {
    const itemId = url.pathname.split('/').at(-1);
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const body = await readBody(request);
    const item = await updateText(env, userId, itemId, {
      title: typeof body.title === 'string' ? body.title : undefined,
      content: typeof body.content === 'string' ? body.content : undefined
    });
    return corsResponse(request, { item });
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/items/')) {
    const itemId = url.pathname.split('/').at(-1);
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    await deleteItem(env, userId, itemId);
    return corsResponse(request, { ok: true });
  }

  if (method === 'GET' && url.pathname.startsWith('/api/files/') && url.pathname.endsWith('/download')) {
    const segments = url.pathname.split('/');
    const itemId = segments[3];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const { object, fileRow } = await downloadItemFile(env, userId, itemId);
    const headers = new Headers();
    headers.set('Content-Type', fileRow.mime_type || object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', object.size.toString());
    headers.set('Content-Disposition', `attachment; filename="${fileRow.original_name.replace(/"/g, '\\"')}"`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(object.body, { headers });
  }

  if (method === 'POST' && url.pathname === '/api/uploads') {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    if (!(file instanceof File)) return errorResponse(400, 'Missing file upload.');
    const item = await uploadItem(env, userId, file, typeof title === 'string' ? title : undefined);
    return corsResponse(request, { item }, { status: 201 });
  }

  return notFound();
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsResponse(request, { ok: true }).headers });
    }

    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return corsResponse(request, { ok: true });
    }

    const user = await getAuthenticatedUser(request, env);
    if (!user) {
      return withCors(request, errorResponse(401, 'Unauthorized.'));
    }

    try {
      const response = await handleItems(request, env, user.id);
      return withCors(request, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected failure.';
      return withCors(request, errorResponse(400, message));
    }
  }
};
