import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createTextItemSchema, expirationTypeSchema, updateTextItemSchema } from '../../../shared/schemas';
import { DEFAULT_EXPIRATION_TYPE, MAX_UPLOAD_BYTES } from '../../../shared/constants';
import type { ExpirationType, FileMetadata, ItemSummary, ItemType } from '../../../shared/types';
import { sanitizeFilename } from '../../../shared/utils';
import type { Env } from '../types';
import { deleteFile, getFile, putFile } from './storage';
import { recordActivity } from './activity';

interface ItemRow {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  created_at: string;
  updated_at: string;
  expiration_type: ExpirationType;
  expires_at: string | null;
}

interface FileRow {
  item_id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size: number;
}

interface TextRow {
  item_id: string;
  content: string;
}

interface StorageDeletionRow {
  id: string;
  storage_key: string;
  attempts: number;
}

const selectItemColumns = 'id,user_id,type,title,created_at,updated_at,expiration_type,expires_at';

const createDb = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

const toFileMetadata = (row: FileRow): FileMetadata => ({
  originalName: row.original_name,
  mimeType: row.mime_type,
  size: row.size
});

const mapItem = (item: ItemRow, fileRow?: FileRow, textRow?: TextRow): ItemSummary => ({
  id: item.id,
  type: item.type,
  title: item.title,
  expirationType: item.expiration_type,
  expiresAt: item.expires_at,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  file: fileRow ? toFileMetadata(fileRow) : undefined,
  text: textRow ? { content: textRow.content } : undefined
});

const getTextSizeBytes = (value: string) => new TextEncoder().encode(value).length;

const getFileExtension = (filename?: string | null) => {
  if (!filename) return '';
  const normalized = filename.trim().toLowerCase();
  if (!normalized) return '';
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot < 0 || lastDot === normalized.length - 1) return '';
  return normalized.slice(lastDot + 1);
};

const getActivityFileEntity = (filename?: string | null, mimeType?: string | null) => {
  const extension = getFileExtension(filename);
  const normalizedMimeType = mimeType?.trim().toLowerCase() ?? '';
  const isImage =
    normalizedMimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'ico', 'tiff', 'tif', 'svg'].includes(extension);

  return {
    entityKind: isImage ? 'image' : 'file',
    entityDetail: extension ? extension.toUpperCase() : null
  } as const;
};

const logActivity = (env: Env, payload: Parameters<typeof recordActivity>[1]) => recordActivity(env, payload).catch(() => undefined);

const isExpired = (item: Pick<ItemRow, 'expires_at'>, nowIso = new Date().toISOString()) =>
  Boolean(item.expires_at && item.expires_at <= nowIso);

const isActiveItem = (item: ItemRow) => !isExpired(item);

const getItemRows = async (db: SupabaseClient, userId: string) => {
  const { data: items, error: itemsError } = await db
    .from('items')
    .select(selectItemColumns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).filter((item) => isActiveItem(item as ItemRow)).map((item) => item.id);
  if (itemIds.length === 0) {
    return { items: [] as ItemRow[], files: [] as FileRow[], textItems: [] as TextRow[] };
  }

  const [{ data: fileRows, error: fileError }, { data: textRows, error: textError }] = await Promise.all([
    db.from('files').select('item_id,storage_key,original_name,mime_type,size').in('item_id', itemIds),
    db.from('text_items').select('item_id,content').in('item_id', itemIds)
  ]);

  if (fileError) throw fileError;
  if (textError) throw textError;

  return {
    items: (items ?? []).filter((item) => isActiveItem(item as ItemRow)) as ItemRow[],
    files: fileRows ?? [],
    textItems: textRows ?? []
  };
};

const getItemWithRelations = async (db: SupabaseClient, userId: string, itemId: string) => {
  const { data: item, error: itemError } = await db.from('items').select(selectItemColumns).eq('id', itemId).eq('user_id', userId).single();
  if (itemError || !item) throw itemError ?? new Error('Not found.');
  if (!isActiveItem(item as ItemRow)) throw new Error('Not found.');

  const typedItem = item as ItemRow;
  let fileRow: FileRow | undefined;
  let textRow: TextRow | undefined;
  let fileError: unknown = null;
  let textError: unknown = null;

  if (typedItem.type === 'file') {
    const result = await db.from('files').select('item_id,storage_key,original_name,mime_type,size').eq('item_id', itemId).single();
    fileRow = result.data ?? undefined;
    fileError = result.error;
  } else {
    const result = await db.from('text_items').select('item_id,content').eq('item_id', itemId).single();
    textRow = result.data ?? undefined;
    textError = result.error;
  }

  if (fileError || (typedItem.type === 'file' && !fileRow)) throw fileError ?? new Error('File metadata missing.');
  if (textError || (typedItem.type === 'text' && !textRow)) throw textError ?? new Error('Text metadata missing.');

  return {
    item: typedItem,
    fileRow,
    textRow
  };
};

const queueFileDeletion = async (
  db: SupabaseClient,
  payload: {
    storageKey: string;
    itemId: string;
    userId: string;
    reason: 'consume' | 'expired' | 'delete';
  }
) => {
  const { error } = await db.from('storage_deletion_queue').upsert(
    {
      storage_key: payload.storageKey,
      item_id: payload.itemId,
      user_id: payload.userId,
      reason: payload.reason,
      attempts: 0,
      last_error: null,
      next_attempt_at: new Date().toISOString()
    },
    { onConflict: 'storage_key' }
  );

  if (error) throw error;
};

const clearQueuedFileDeletion = async (db: SupabaseClient, storageKey: string) => {
  const { error } = await db.from('storage_deletion_queue').delete().eq('storage_key', storageKey);
  if (error) throw error;
};

const recordQueuedDeletionFailure = async (db: SupabaseClient, row: StorageDeletionRow, error: unknown) => {
  const message = error instanceof Error ? error.message : 'Storage deletion failed.';
  const nextAttemptAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { error: updateError } = await db
    .from('storage_deletion_queue')
    .update({
      attempts: row.attempts + 1,
      last_error: message,
      next_attempt_at: nextAttemptAt
    })
    .eq('id', row.id);

  if (updateError) throw updateError;
};

const tryDeleteQueuedFile = async (env: Env, db: SupabaseClient, row: StorageDeletionRow) => {
  try {
    await deleteFile(env, row.storage_key);
    await clearQueuedFileDeletion(db, row.storage_key);
  } catch (error) {
    await recordQueuedDeletionFailure(db, row, error);
  }
};

export const listItems = async (env: Env, userId: string, query: string) => {
  const db = createDb(env);
  const rows = await getItemRows(db, userId);
  const normalizedQuery = query.trim().toLowerCase();

  return rows.items
    .map((item) => ({
      ...mapItem(
        item,
        rows.files.find((file) => file.item_id === item.id),
        rows.textItems.find((textItem) => textItem.item_id === item.id)
      )
    }))
    .filter((item) => {
      if (!normalizedQuery) return true;
      const title = item.title.toLowerCase();
      const content = item.text?.content.toLowerCase() ?? '';
      const filename = item.file?.originalName.toLowerCase() ?? '';
      return title.includes(normalizedQuery) || content.includes(normalizedQuery) || filename.includes(normalizedQuery);
    });
};

export const createText = async (
  env: Env,
  userId: string,
  payload: { title: string; content: string; expirationType: ExpirationType }
) => {
  const parsed = createTextItemSchema.parse(payload);
  const db = createDb(env);

  const { data: item, error: itemError } = await db
    .from('items')
    .insert({
      user_id: userId,
      type: 'text',
      title: parsed.title,
      expiration_type: parsed.expirationType
    })
    .select(selectItemColumns)
    .single();

  if (itemError || !item) throw itemError ?? new Error('Failed to create item.');

  const { error: textError } = await db.from('text_items').insert({
    item_id: item.id,
    content: parsed.content
  });

  if (textError) {
    await db.from('items').delete().eq('id', item.id).eq('user_id', userId);
    throw textError;
  }

  await logActivity(env, {
    userId,
    action: 'create',
    title: item.title,
    itemId: item.id,
    itemType: 'text',
    entityKind: 'note',
    sizeBytes: getTextSizeBytes(parsed.content)
  });

  return mapItem(item as ItemRow, undefined, { item_id: item.id, content: parsed.content });
};

export const updateText = async (env: Env, userId: string, itemId: string, payload: { title?: string; content?: string }) => {
  const parsed = updateTextItemSchema.parse(payload);
  const db = createDb(env);

  const { data: existing, error: existingError } = await db.from('items').select(selectItemColumns).eq('id', itemId).eq('user_id', userId).single();

  if (existingError || !existing) throw existingError ?? new Error('Not found.');
  if (!isActiveItem(existing as ItemRow)) throw new Error('Not found.');
  if ((existing as ItemRow).type !== 'text') throw new Error('Only text items can be edited.');

  const updatePayload: Record<string, string> = {};
  if (parsed.title) updatePayload.title = parsed.title;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await db.from('items').update(updatePayload).eq('id', itemId).eq('user_id', userId);
    if (error) throw error;
  }

  if (parsed.content !== undefined) {
    const { error } = await db.from('text_items').update({ content: parsed.content }).eq('item_id', itemId);
    if (error) throw error;
  }

  const { data: refreshed } = await db.from('items').select(selectItemColumns).eq('id', itemId).eq('user_id', userId).single();
  const { data: textRow } = await db.from('text_items').select('item_id,content').eq('item_id', itemId).single();

  await logActivity(env, {
    userId,
    action: 'edit',
    title: (refreshed as ItemRow).title,
    itemId,
    itemType: 'text',
    entityKind: 'note',
    sizeBytes: textRow?.content ? getTextSizeBytes(textRow.content) : null
  });

  return mapItem(refreshed as ItemRow, undefined, textRow ?? undefined);
};

export const updateExpiration = async (env: Env, userId: string, itemId: string, payload: { expirationType: ExpirationType }) => {
  const parsed = expirationTypeSchema.parse(payload.expirationType);
  const db = createDb(env);

  const { data: existing, error: existingError } = await db.from('items').select(selectItemColumns).eq('id', itemId).eq('user_id', userId).single();
  if (existingError || !existing) throw existingError ?? new Error('Not found.');
  if (!isActiveItem(existing as ItemRow)) throw new Error('Not found.');

  const { error: updateError } = await db
    .from('items')
    .update({ expiration_type: parsed })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (updateError) throw updateError;

  const { data: refreshed, error: refreshedError } = await db.from('items').select(selectItemColumns).eq('id', itemId).eq('user_id', userId).single();
  if (refreshedError || !refreshed) throw refreshedError ?? new Error('Not found.');

  const { data: fileRow } =
    (refreshed as ItemRow).type === 'file'
      ? await db.from('files').select('item_id,storage_key,original_name,mime_type,size').eq('item_id', itemId).single()
      : { data: null };
  const { data: textRow } =
    (refreshed as ItemRow).type === 'text'
      ? await db.from('text_items').select('item_id,content').eq('item_id', itemId).single()
      : { data: null };

  await logActivity(env, {
    userId,
    action: 'edit',
    title: (refreshed as ItemRow).title,
    itemId,
    itemType: (refreshed as ItemRow).type,
    ...(fileRow && (refreshed as ItemRow).type === 'file'
      ? { ...getActivityFileEntity(fileRow.original_name, fileRow.mime_type), sizeBytes: fileRow.size }
      : { entityKind: 'note', sizeBytes: textRow?.content ? getTextSizeBytes(textRow.content) : null })
  });

  return mapItem(refreshed as ItemRow, fileRow ?? undefined, textRow ?? undefined);
};

export const deleteItem = async (env: Env, userId: string, itemId: string) => {
  const db = createDb(env);
  const { item, fileRow, textRow } = await getItemWithRelations(db, userId, itemId);

  if (item.type === 'file' && fileRow) {
    await queueFileDeletion(db, {
      storageKey: fileRow.storage_key,
      itemId: item.id,
      userId,
      reason: 'delete'
    });
  }

  const { error: deleteError } = await db.from('items').delete().eq('id', item.id).eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (item.type === 'file' && fileRow) {
    const { data: queuedRows, error: queueError } = await db
      .from('storage_deletion_queue')
      .select('id,storage_key,attempts')
      .eq('storage_key', fileRow.storage_key)
      .limit(1);

    if (queueError) throw queueError;
    if (queuedRows?.[0]) {
      await tryDeleteQueuedFile(env, db, queuedRows[0] as StorageDeletionRow);
    }
  }

  const sizeBytes = item.type === 'file' && fileRow ? fileRow.size : textRow?.content ? getTextSizeBytes(textRow.content) : null;
  await logActivity(env, {
    userId,
    action: 'delete',
    title: item.title,
    itemId,
    itemType: item.type,
    ...(item.type === 'file' && fileRow
      ? { ...getActivityFileEntity(fileRow.original_name, fileRow.mime_type), sizeBytes }
      : { entityKind: 'note', sizeBytes })
  });
};

export const consumeItem = async (env: Env, userId: string, itemId: string) => {
  const db = createDb(env);
  const { item, fileRow, textRow } = await getItemWithRelations(db, userId, itemId);
  if (item.expiration_type !== 'CONSUME') throw new Error('Item is not configured for consume deletion.');

  if (item.type === 'file' && fileRow) {
    await queueFileDeletion(db, {
      storageKey: fileRow.storage_key,
      itemId: item.id,
      userId,
      reason: 'consume'
    });
  }

  const { error: deleteError } = await db.from('items').delete().eq('id', item.id).eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (item.type === 'file' && fileRow) {
    const { data: queuedRows, error: queueError } = await db
      .from('storage_deletion_queue')
      .select('id,storage_key,attempts')
      .eq('storage_key', fileRow.storage_key)
      .limit(1);

    if (queueError) throw queueError;
    if (queuedRows?.[0]) {
      await tryDeleteQueuedFile(env, db, queuedRows[0] as StorageDeletionRow);
    }
  }

  const sizeBytes = item.type === 'file' && fileRow ? fileRow.size : textRow?.content ? getTextSizeBytes(textRow.content) : null;
  await logActivity(env, {
    userId,
    action: 'delete',
    title: item.title,
    itemId,
    itemType: item.type,
    ...(item.type === 'file' && fileRow
      ? { ...getActivityFileEntity(fileRow.original_name, fileRow.mime_type), sizeBytes }
      : { entityKind: 'note', sizeBytes })
  });
};

export const uploadItem = async (env: Env, userId: string, file: File, title?: string, expirationType?: string) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File is too large.');
  }

  const parsedExpiration = expirationTypeSchema.parse(expirationType ?? DEFAULT_EXPIRATION_TYPE);
  const db = createDb(env);
  const safeName = sanitizeFilename(file.name || 'upload');
  const storageKey = `${userId}/${crypto.randomUUID()}-${safeName}`;

  await putFile(env, storageKey, file);

  try {
    const { data: item, error: itemError } = await db
      .from('items')
      .insert({
        user_id: userId,
        type: 'file',
        title: title?.trim() || safeName,
        expiration_type: parsedExpiration
      })
      .select(selectItemColumns)
      .single();

    if (itemError || !item) throw itemError ?? new Error('Failed to create file item.');

    const { error: fileError } = await db.from('files').insert({
      item_id: item.id,
      storage_key: storageKey,
      original_name: safeName,
      mime_type: file.type || 'application/octet-stream',
      size: file.size
    });

    if (fileError) {
      await db.from('items').delete().eq('id', item.id).eq('user_id', userId);
      await deleteFile(env, storageKey);
      throw fileError;
    }

    await logActivity(env, {
      userId,
      action: 'upload',
      title: item.title,
      itemId: item.id,
      itemType: 'file',
      ...getActivityFileEntity(safeName, file.type || 'application/octet-stream'),
      sizeBytes: file.size
    });

    return mapItem(item as ItemRow, {
      item_id: item.id,
      storage_key: storageKey,
      original_name: safeName,
      mime_type: file.type || 'application/octet-stream',
      size: file.size
    });
  } catch (error) {
    await deleteFile(env, storageKey);
    throw error;
  }
};

export const downloadItemFile = async (env: Env, userId: string, itemId: string) => {
  const db = createDb(env);
  const { item, fileRow } = await getItemWithRelations(db, userId, itemId);
  if (item.type !== 'file' || !fileRow) throw new Error('Not found.');

  const object = await getFile(env, fileRow.storage_key);
  if (!object) throw new Error('File missing from storage.');

  return {
    object,
    fileRow
  };
};

const processExpiredFileItems = async (env: Env) => {
  const db = createDb(env);
  const nowIso = new Date().toISOString();
  const { data: expiredRows, error } = await db
    .from('items')
    .select(selectItemColumns)
    .lt('expires_at', nowIso)
    .order('expires_at', { ascending: true })
    .limit(50);

  if (error) throw error;

  for (const rawItem of expiredRows ?? []) {
    const item = rawItem as ItemRow;
    try {
      const { data: fileRow, error: fileError } =
        item.type === 'file'
          ? await db.from('files').select('item_id,storage_key,original_name,mime_type,size').eq('item_id', item.id).single()
          : { data: null, error: null };

      if (fileError) throw fileError;

      if (item.type === 'file' && fileRow) {
        await queueFileDeletion(db, {
          storageKey: fileRow.storage_key,
          itemId: item.id,
          userId: item.user_id,
          reason: 'expired'
        });
      }

      const { error: deleteError } = await db.from('items').delete().eq('id', item.id).eq('user_id', item.user_id);
      if (deleteError) throw deleteError;

      if (item.type === 'file' && fileRow) {
        const { data: queuedRows, error: queueError } = await db
          .from('storage_deletion_queue')
          .select('id,storage_key,attempts')
          .eq('storage_key', fileRow.storage_key)
          .limit(1);

        if (queueError) throw queueError;
        if (queuedRows?.[0]) {
          await tryDeleteQueuedFile(env, db, queuedRows[0] as StorageDeletionRow);
        }
      }
    } catch {
      continue;
    }
  }
};

const processStorageDeletionQueue = async (env: Env) => {
  const db = createDb(env);
  const { data: queuedRows, error } = await db
    .from('storage_deletion_queue')
    .select('id,storage_key,attempts')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(25);

  if (error) throw error;

  for (const row of (queuedRows ?? []) as StorageDeletionRow[]) {
    await tryDeleteQueuedFile(env, db, row);
  }
};

export const runScheduledCleanup = async (env: Env) => {
  await processExpiredFileItems(env);
  await processStorageDeletionQueue(env);
};
