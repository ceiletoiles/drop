import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { textItemSchema, updateTextItemSchema } from '../../../shared/schemas';
import { MAX_UPLOAD_BYTES } from '../../../shared/constants';
import type { FileMetadata, ItemSummary, ItemType } from '../../../shared/types';
import { sanitizeFilename } from '../../../shared/utils';
import type { Env } from '../types';
import { deleteFile, getFile, putFile } from './storage';

interface ItemRow {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  created_at: string;
  updated_at: string;
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
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  file: fileRow ? toFileMetadata(fileRow) : undefined,
  text: textRow ? { content: textRow.content } : undefined
});

const getItemRows = async (db: SupabaseClient, userId: string) => {
  const { data: items, error: itemsError } = await db
    .from('items')
    .select('id,user_id,type,title,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).map((item) => item.id);
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
    items: items ?? [],
    files: fileRows ?? [],
    textItems: textRows ?? []
  };
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

export const createText = async (env: Env, userId: string, payload: { title: string; content: string }) => {
  const parsed = textItemSchema.parse(payload);
  const db = createDb(env);

  const { data: item, error: itemError } = await db
    .from('items')
    .insert({
      user_id: userId,
      type: 'text',
      title: parsed.title
    })
    .select('id,user_id,type,title,created_at,updated_at')
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

  return mapItem(item as ItemRow, undefined, { item_id: item.id, content: parsed.content });
};

export const updateText = async (env: Env, userId: string, itemId: string, payload: { title?: string; content?: string }) => {
  const parsed = updateTextItemSchema.parse(payload);
  const db = createDb(env);

  const { data: existing, error: existingError } = await db
    .from('items')
    .select('id,user_id,type,title,created_at,updated_at')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (existingError || !existing) throw existingError ?? new Error('Not found.');
  if (existing.type !== 'text') throw new Error('Only text items can be edited.');

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

  const { data: refreshed } = await db
    .from('items')
    .select('id,user_id,type,title,created_at,updated_at')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  const { data: textRow } = await db.from('text_items').select('item_id,content').eq('item_id', itemId).single();

  return mapItem(refreshed as ItemRow, undefined, textRow ?? undefined);
};

export const deleteItem = async (env: Env, userId: string, itemId: string) => {
  const db = createDb(env);
  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,type,title,created_at,updated_at')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (itemError || !item) throw itemError ?? new Error('Not found.');

  if (item.type === 'file') {
    const { data: fileRow, error: fileError } = await db
      .from('files')
      .select('item_id,storage_key,original_name,mime_type,size')
      .eq('item_id', itemId)
      .single();
    if (fileError || !fileRow) throw fileError ?? new Error('File metadata missing.');
    await deleteFile(env, fileRow.storage_key);
  }

  const { error: deleteError } = await db.from('text_items').delete().eq('item_id', itemId);
  if (deleteError) throw deleteError;

  const { error: fileDeleteError } = await db.from('files').delete().eq('item_id', itemId);
  if (fileDeleteError) throw fileDeleteError;

  const { error: itemDeleteError } = await db.from('items').delete().eq('id', itemId).eq('user_id', userId);
  if (itemDeleteError) throw itemDeleteError;
};

export const uploadItem = async (
  env: Env,
  userId: string,
  file: File,
  title?: string
) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File is too large.');
  }

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
        title: title?.trim() || safeName
      })
      .select('id,user_id,type,title,created_at,updated_at')
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
  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,type,title,created_at,updated_at')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (itemError || !item || item.type !== 'file') throw itemError ?? new Error('Not found.');

  const { data: fileRow, error: fileError } = await db
    .from('files')
    .select('item_id,storage_key,original_name,mime_type,size')
    .eq('item_id', itemId)
    .single();

  if (fileError || !fileRow) throw fileError ?? new Error('File metadata missing.');

  const object = await getFile(env, fileRow.storage_key);
  if (!object) throw new Error('File missing from storage.');

  return {
    object,
    fileRow
  };
};
