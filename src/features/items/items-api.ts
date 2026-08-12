import type { CreateTextResponse, ItemsResponse, UpdateTextResponse, UploadResponse } from '../../../shared/types';
import { apiUrl } from '../../lib/env';
import { apiFetch } from '../../lib/http';

export const fetchItems = (token: string, query: string) =>
  apiFetch<ItemsResponse>(`/api/items?query=${encodeURIComponent(query)}`, { token });

export const createTextItem = (token: string, payload: { title: string; content: string }) =>
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

export const deleteItem = (token: string, itemId: string) =>
  apiFetch<{ ok: true }>(`/api/items/${itemId}`, {
    method: 'DELETE',
    token
  });

export const uploadFile = (
  token: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadResponse> =>
  new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/uploads'));
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed.'));
    xhr.onload = () => {
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
    xhr.send(formData);
  });
