import type { CreateTextResponse, ExpirationType, ItemsResponse, UpdateTextResponse, UploadResponse } from '../../../shared/types';
import { apiUrl } from '../../lib/env';
import { apiFetch } from '../../lib/http';

export const fetchItems = (token: string, query: string) =>
  apiFetch<ItemsResponse>(`/api/items?query=${encodeURIComponent(query)}`, { token });

export const createTextItem = (token: string, payload: { title: string; content: string; expirationType: ExpirationType }) =>
  apiFetch<CreateTextResponse>('/api/items/text', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });

export const updateTextItem = (token: string, itemId: string, payload: { title?: string; content?: string }) =>
  apiFetch<UpdateTextResponse>(`/api/items/text/${itemId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });

export const updateExpirationItem = (token: string, itemId: string, payload: { expirationType: ExpirationType }) =>
  apiFetch<{ item: CreateTextResponse['item'] }>(`/api/items/${itemId}/expiration`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload)
  });

export const extendExpirationItem = (token: string, itemId: string, expirationType: Exclude<ExpirationType, 'CONSUME'>) =>
  apiFetch<{ item: CreateTextResponse['item'] }>(`/api/items/${itemId}/expiration`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ expirationType })
  });

export const reduceExpirationItem = (token: string, itemId: string, expirationType: Exclude<ExpirationType, 'CONSUME'>) =>
  apiFetch<{ item: CreateTextResponse['item'] }>(`/api/items/${itemId}/expiration/reduce`, {
    method: 'POST',
    token,
    body: JSON.stringify({ expirationType })
  });

export const deleteItem = (token: string, itemId: string) =>
  apiFetch<{ ok: true }>(`/api/items/${itemId}`, {
    method: 'DELETE',
    token
  });

export const consumeItem = (token: string, itemId: string) =>
  apiFetch<{ ok: true }>(`/api/items/${itemId}/consume`, {
    method: 'POST',
    token
  });

export const uploadFile = (
  token: string,
  file: File,
  expirationType: ExpirationType,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadResponse> =>
  new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/uploads'));
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    if (signal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }

    const handleAbort = () => xhr.abort();
    signal?.addEventListener('abort', handleAbort, { once: true });

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort);
    };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Upload failed.'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error('Upload cancelled.'));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadResponse);
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string };
        reject(new Error(payload.error ?? 'Upload failed.'));
      } catch {
        reject(new Error('Upload failed.'));
      }
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('expirationType', expirationType);
    xhr.send(formData);
  });
