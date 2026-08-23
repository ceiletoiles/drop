import type { ShareCreateResponse, ShareResponse } from '../../../shared/types';
import { apiUrl } from '../../lib/env';
import { apiFetch, readApiError } from '../../lib/http';

export const createShare = (token: string, itemId: string) =>
  apiFetch<ShareCreateResponse>(`/api/items/${itemId}/share`, {
    method: 'POST',
    token
  });

export const revokeShare = (token: string, itemId: string) =>
  apiFetch<{ ok: true }>(`/api/items/${itemId}/share`, {
    method: 'DELETE',
    token
  });

export const fetchItemShare = (token: string, itemId: string) =>
  apiFetch<ShareCreateResponse>(`/api/items/${itemId}/share`, {
    method: 'GET',
    token
  });

export const fetchShare = async (shareToken: string): Promise<ShareResponse> => {
  const response = await fetch(apiUrl(`/api/share/${shareToken}`));
  if (!response.ok) {
    throw await readApiError(response);
  }

  return (await response.json()) as ShareResponse;
};

export const copySharedText = async (shareToken: string) =>
  apiFetch<{ item: ShareResponse['item'] }>(`/api/share/${shareToken}/copy`, {
    method: 'POST'
  });

export const downloadSharedFile = async (shareToken: string) => {
  const response = await fetch(apiUrl(`/api/share/${shareToken}/download`));
  if (!response.ok) {
    throw await readApiError(response);
  }

  return response;
};
