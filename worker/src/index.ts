import type { Env } from './types';
import { getAuthenticatedUser } from './lib/auth';
import { corsResponse, errorResponse, withCors } from './lib/response';
import {
  copySharedItemText,
  createShareLink,
  createText,
  consumeItem,
  deleteItem,
  downloadItemFile,
  downloadSharedItemFile,
  getItemShareLink,
  getSharedItem,
  listItems,
  revokeShareLink,
  runScheduledCleanup,
  updateExpiration,
  updateText,
  uploadItem
} from './lib/items';
import { getUploadDefaultExpirationType, setUploadDefaultExpirationType } from './lib/user-preferences';
import {
  copySpaceItemText,
  createSpace,
  createSpaceFile,
  createSpaceInviteLink,
  createSpaceText,
  deleteSpace,
  deleteSpaceItem,
  getSpace,
  joinSpaceInvite,
  leaveSpace,
  listSpaces,
  listMySpaceInvitations,
  removeSpaceMember,
  renameSpace,
  revokeSpaceInviteLink,
  downloadSpaceItemFile,
  updateSpaceText,
  updateSpaceItemExpiration,
  validateSpaceInvite
} from './lib/spaces';
import { listActivities, recordActivity } from './lib/activity';
import { expirationTypeSchema, spaceExpirationTypeSchema } from '../../shared/schemas';
import { MAX_SEARCH_CHARS } from '../../shared/constants';

const readBody = async (request: Request) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json() as Promise<Record<string, unknown>>;
  }
  return {};
};

const notFound = () => errorResponse(404, 'Not found.');

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unexpected failure.';
};

const handlePublicSpaceInvite = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const token = segments[4];
  if (!token) return errorResponse(400, 'Invalid invitation token.');

  if (request.method === 'GET' && segments.length === 5) {
    const payload = await validateSpaceInvite(env, token);
    return corsResponse(request, payload);
  }

  return notFound();
};

const handleSpaces = async (request: Request, env: Env, user: { id: string; email: string | null; displayName: string }) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.split('/');

  if (method === 'GET' && url.pathname === '/api/spaces') {
    const payload = await listSpaces(env, user.id);
    return corsResponse(request, payload);
  }

  if (method === 'GET' && url.pathname === '/api/me/space-invitations') {
    const payload = await listMySpaceInvitations(env, user.email);
    return corsResponse(request, payload);
  }

  if (method === 'POST' && url.pathname === '/api/spaces') {
    const body = await readBody(request);
    const payload = await createSpace(
      env,
      { name: typeof body.name === 'string' ? body.name : '' },
      user.id,
      user.displayName
    );
    return corsResponse(request, payload, { status: 201 });
  }

  if (url.pathname.startsWith('/api/spaces/invitations/')) {
    const token = segments[4];
    if (!token) return errorResponse(400, 'Invalid invitation token.');

    if (method === 'POST' && segments[5] === 'join') {
      const payload = await joinSpaceInvite(env, user.id, user.email, user.displayName, token);
      return corsResponse(request, payload);
    }

    return notFound();
  }

  const spaceId = segments[3];
  if (!spaceId) return notFound();

  if (method === 'GET' && url.pathname === `/api/spaces/${spaceId}`) {
    const payload = await getSpace(env, user.id, spaceId);
    return corsResponse(request, payload);
  }

  if (method === 'PATCH' && url.pathname === `/api/spaces/${spaceId}`) {
    const body = await readBody(request);
    const payload = await renameSpace(env, user.id, spaceId, typeof body.name === 'string' ? body.name : '');
    return corsResponse(request, payload);
  }

  if (method === 'DELETE' && url.pathname === `/api/spaces/${spaceId}`) {
    const payload = await deleteSpace(env, user.id, spaceId);
    return corsResponse(request, payload);
  }

  if (method === 'POST' && url.pathname === `/api/spaces/${spaceId}/leave`) {
    const payload = await leaveSpace(env, user.id, spaceId);
    return corsResponse(request, payload);
  }

  if (method === 'DELETE' && url.pathname.startsWith(`/api/spaces/${spaceId}/members/`)) {
    const memberUserId = segments[5];
    if (!memberUserId) return errorResponse(400, 'Invalid member id.');
    const payload = await removeSpaceMember(env, user.id, spaceId, memberUserId);
    return corsResponse(request, payload);
  }

  if (method === 'POST' && url.pathname === `/api/spaces/${spaceId}/invitations`) {
    const body = await readBody(request);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      await revokeSpaceInviteLink(env, user.id, spaceId);
    }
    const payload = await createSpaceInviteLink(env, user.id, spaceId, email || null);
    return corsResponse(request, payload, { status: 201 });
  }

  if (method === 'DELETE' && url.pathname === `/api/spaces/${spaceId}/invitations`) {
    const payload = await revokeSpaceInviteLink(env, user.id, spaceId);
    return corsResponse(request, payload);
  }

  if (method === 'POST' && url.pathname === `/api/spaces/${spaceId}/uploads`) {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const expirationType = formData.get('expirationType');
    if (!(file instanceof File)) return errorResponse(400, 'Missing file upload.');
    const item = await createSpaceFile(
      env,
      user.id,
      file,
      spaceId,
      typeof title === 'string' ? title : undefined,
      typeof expirationType === 'string' ? expirationType : undefined
    );
    return corsResponse(request, { item }, { status: 201 });
  }

  if (method === 'POST' && url.pathname === `/api/spaces/${spaceId}/text`) {
    const body = await readBody(request);
    const expirationType =
      body.expirationType === undefined
        ? '24_HOURS'
        : spaceExpirationTypeSchema.parse(body.expirationType);
    const item = await createSpaceText(env, user.id, {
      title: typeof body.title === 'string' ? body.title : '',
      content: typeof body.content === 'string' ? body.content : '',
      expirationType,
      spaceId
    });
    return corsResponse(request, { item }, { status: 201 });
  }

  if (method === 'PUT' && url.pathname.startsWith(`/api/spaces/${spaceId}/text/`)) {
    const itemId = segments[5];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const body = await readBody(request);
    const item = await updateSpaceText(env, user.id, spaceId, itemId, {
      title: typeof body.title === 'string' ? body.title : undefined,
      content: typeof body.content === 'string' ? body.content : undefined
    });
    return corsResponse(request, { item });
  }

  if (method === 'GET' && url.pathname.startsWith(`/api/spaces/${spaceId}/items/`) && url.pathname.endsWith('/download')) {
    const itemId = segments[5];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const { object, fileRow } = await downloadSpaceItemFile(env, user.id, spaceId, itemId);
    const headers = new Headers();
    headers.set('Content-Type', fileRow.mime_type || object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', object.size.toString());
    headers.set('Content-Disposition', `attachment; filename="${fileRow.original_name.replace(/"/g, '\\"')}"`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(object.body, { headers });
  }

  if (method === 'POST' && url.pathname.startsWith(`/api/spaces/${spaceId}/items/`) && url.pathname.endsWith('/copy')) {
    const itemId = segments[5];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const payload = await copySpaceItemText(env, user.id, spaceId, itemId);
    return corsResponse(request, payload);
  }

  if (method === 'PATCH' && url.pathname.startsWith(`/api/spaces/${spaceId}/items/`) && url.pathname.endsWith('/expiration')) {
    const itemId = segments[5];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const body = await readBody(request);
    const expirationType = spaceExpirationTypeSchema.parse(body.expirationType);
    const payload = await updateSpaceItemExpiration(env, user.id, spaceId, itemId, expirationType);
    return corsResponse(request, payload);
  }

  if (method === 'DELETE' && url.pathname.startsWith(`/api/spaces/${spaceId}/items/`)) {
    const itemId = segments[5];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const payload = await deleteSpaceItem(env, user.id, spaceId, itemId);
    return corsResponse(request, payload);
  }

  return notFound();
};

const handlePublicShare = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const token = segments[3];
  if (!token) return errorResponse(400, 'Invalid share token.');

  if (request.method === 'GET' && segments.length === 4) {
    const payload = await getSharedItem(env, token);
    return corsResponse(request, payload);
  }

  if (request.method === 'GET' && segments[4] === 'download') {
    const { object, fileRow } = await downloadSharedItemFile(env, token);
    const headers = new Headers();
    headers.set('Content-Type', fileRow.mime_type || object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', object.size.toString());
    headers.set('Content-Disposition', `attachment; filename="${fileRow.original_name.replace(/"/g, '\\"')}"`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return withCors(request, new Response(object.body, { headers }));
  }

  if (request.method === 'POST' && segments[4] === 'copy') {
    const payload = await copySharedItemText(env, token);
    return corsResponse(request, payload);
  }

  return notFound();
};

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

  if (method === 'GET' && url.pathname === '/api/me/upload-default-expiration') {
    const payload = await getUploadDefaultExpirationType(env, userId);
    return corsResponse(request, payload);
  }

  if (method === 'PATCH' && url.pathname === '/api/me/upload-default-expiration') {
    const body = await readBody(request);
    const payload = await setUploadDefaultExpirationType(
      env,
      userId,
      typeof body.uploadDefaultExpirationType === 'string' ? body.uploadDefaultExpirationType : ''
    );
    return corsResponse(request, payload);
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
    const expirationType =
      body.expirationType === undefined
        ? '24_HOURS'
        : expirationTypeSchema.parse(body.expirationType);
    const item = await createText(env, userId, {
      title: typeof body.title === 'string' ? body.title : '',
      content: typeof body.content === 'string' ? body.content : '',
      expirationType
    });
    return corsResponse(request, { item }, { status: 201 });
  }

  if (method === 'POST' && url.pathname.startsWith('/api/items/') && url.pathname.endsWith('/share')) {
    const segments = url.pathname.split('/');
    const itemId = segments[3];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const payload = await createShareLink(env, userId, itemId);
    return corsResponse(request, payload, { status: 201 });
  }

  if (method === 'GET' && url.pathname.startsWith('/api/items/') && url.pathname.endsWith('/share')) {
    const segments = url.pathname.split('/');
    const itemId = segments[3];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const payload = await getItemShareLink(env, userId, itemId);
    return corsResponse(request, payload);
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/items/') && url.pathname.endsWith('/share')) {
    const segments = url.pathname.split('/');
    const itemId = segments[3];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const payload = await revokeShareLink(env, userId, itemId);
    return corsResponse(request, payload);
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

  if (method === 'PATCH' && url.pathname.startsWith('/api/items/') && url.pathname.endsWith('/expiration')) {
    const segments = url.pathname.split('/');
    const itemId = segments[3];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    const body = await readBody(request);
    const expirationType = expirationTypeSchema.parse(body.expirationType);
    const item = await updateExpiration(env, userId, itemId, { expirationType });
    return corsResponse(request, { item });
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/items/')) {
    const itemId = url.pathname.split('/').at(-1);
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    await deleteItem(env, userId, itemId);
    return corsResponse(request, { ok: true });
  }

  if (method === 'POST' && url.pathname.startsWith('/api/items/') && url.pathname.endsWith('/consume')) {
    const segments = url.pathname.split('/');
    const itemId = segments[3];
    if (!itemId) return errorResponse(400, 'Invalid item id.');
    await consumeItem(env, userId, itemId);
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
    const expirationType = formData.get('expirationType');
    if (!(file instanceof File)) return errorResponse(400, 'Missing file upload.');
    const item = await uploadItem(
      env,
      userId,
      file,
      typeof title === 'string' ? title : undefined,
      typeof expirationType === 'string' ? expirationType : undefined
    );
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

    if (url.pathname.startsWith('/api/share/')) {
      try {
        const response = await handlePublicShare(request, env);
        return withCors(request, response);
      } catch (error) {
        const message = getErrorMessage(error);
        const status = message === 'This Drop has expired.' ? 404 : 404;
        return withCors(request, errorResponse(status, message));
      }
    }

    if (url.pathname.startsWith('/api/spaces/invitations/') && request.method === 'GET' && url.pathname.split('/').length === 5) {
      try {
        const response = await handlePublicSpaceInvite(request, env);
        return withCors(request, response);
      } catch (error) {
        const message = getErrorMessage(error);
        return withCors(request, errorResponse(404, message));
      }
    }

    const user = await getAuthenticatedUser(request, env);
    if (!user) {
      return withCors(request, errorResponse(401, 'Unauthorized.'));
    }

    try {
      const spaceResponse = await handleSpaces(request, env, user);
      if (spaceResponse.status !== 404 || new URL(request.url).pathname.startsWith('/api/spaces')) {
        return withCors(request, spaceResponse);
      }
      const response = await handleItems(request, env, user.id);
      return withCors(request, response);
    } catch (error) {
      const message = getErrorMessage(error);
      return withCors(request, errorResponse(400, message));
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledCleanup(env));
  }
};
