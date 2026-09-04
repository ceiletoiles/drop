import type {
  CreateSpaceResponse,
  CreateSpaceItemResponse,
  JoinSpaceResponse,
  SpaceDetailResponse,
  SpaceInvitationsResponse,
  SpacesResponse,
  SpaceExpirationType
} from '../../../shared/types';
import type { CreateSpacePayload } from '../../../shared/schemas';
import { apiFetch, readApiError } from '../../lib/http';
import { apiUrl } from '../../lib/env';

export const fetchSpaces = (token: string) => apiFetch<SpacesResponse>('/api/spaces', { token });

export const createSpace = (token: string, payload: CreateSpacePayload) =>
  apiFetch<CreateSpaceResponse>('/api/spaces', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });

export const fetchSpace = (token: string, spaceId: string) => apiFetch<SpaceDetailResponse>(`/api/spaces/${spaceId}`, { token });

export const renameSpace = (token: string, spaceId: string, name: string) =>
  apiFetch<CreateSpaceResponse>(`/api/spaces/${spaceId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ name })
  });

export const deleteSpace = (token: string, spaceId: string) =>
  apiFetch<{ ok: true }>(`/api/spaces/${spaceId}`, {
    method: 'DELETE',
    token
  });

export const createSpaceInvitation = (token: string, spaceId: string, email?: string | null) =>
  apiFetch<{ invitation: { id: string; spaceId: string; invitedEmail: string | null; createdAt: string; expiresAt: string; revokedAt: string | null; acceptedAt: string | null; token?: string; url?: string } }>(
    `/api/spaces/${spaceId}/invitations`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ email: email ?? '' })
    }
  );

export const revokeSpaceInvitation = (token: string, spaceId: string) =>
  apiFetch<{ ok: true }>(`/api/spaces/${spaceId}/invitations`, {
    method: 'DELETE',
    token
  });

export const leaveSpace = (token: string, spaceId: string) =>
  apiFetch<{ ok: true }>(`/api/spaces/${spaceId}/leave`, {
    method: 'POST',
    token
  });

export const removeSpaceMember = (token: string, spaceId: string, memberId: string) =>
  apiFetch<{ ok: true }>(`/api/spaces/${spaceId}/members/${memberId}`, {
    method: 'DELETE',
    token
  });

export const uploadSpaceFile = (
  token: string,
  spaceId: string,
  file: File,
  expirationType: SpaceExpirationType,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<CreateSpaceItemResponse> =>
  new Promise<CreateSpaceItemResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(`/api/spaces/${spaceId}/uploads`));
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
        resolve(JSON.parse(xhr.responseText) as CreateSpaceItemResponse);
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

export const createSpaceText = (
  token: string,
  spaceId: string,
  payload: { title: string; content: string; expirationType: SpaceExpirationType }
) =>
  apiFetch<CreateSpaceItemResponse>(`/api/spaces/${spaceId}/text`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });

export const updateSpaceText = (
  token: string,
  spaceId: string,
  itemId: string,
  payload: { title?: string; content?: string }
) =>
  apiFetch<CreateSpaceItemResponse>(`/api/spaces/${spaceId}/text/${itemId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });

export const updateSpaceItemExpiration = (token: string, spaceId: string, itemId: string, expirationType: SpaceExpirationType) =>
  apiFetch<{ item: CreateSpaceItemResponse['item'] }>(`/api/spaces/${spaceId}/items/${itemId}/expiration`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ expirationType })
  });

export const adjustSpaceItemExpiration = (token: string, spaceId: string, itemId: string, expirationType: SpaceExpirationType, direction: 'extend' | 'reduce') =>
  apiFetch<{ item: CreateSpaceItemResponse['item'] }>(`/api/spaces/${spaceId}/items/${itemId}/expiration/${direction}`, {
    method: 'POST',
    token,
    body: JSON.stringify({ expirationType })
  });

export const deleteSpaceItem = (token: string, spaceId: string, itemId: string) =>
  apiFetch<{ ok: true }>(`/api/spaces/${spaceId}/items/${itemId}`, {
    method: 'DELETE',
    token
  });

export const downloadSpaceItem = async (token: string, spaceId: string, itemId: string) => {
  const response = await fetch(apiUrl(`/api/spaces/${spaceId}/items/${itemId}/download`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw await readApiError(response);
  }
  return response;
};

export const copySpaceText = (token: string, spaceId: string, itemId: string) =>
  apiFetch<{ item: CreateSpaceItemResponse['item'] }>(`/api/spaces/${spaceId}/items/${itemId}/copy`, {
    method: 'POST',
    token
  });

export const validateSpaceInvite = async (token: string) => {
  const response = await fetch(apiUrl(`/api/spaces/invitations/${token}`));
  if (!response.ok) {
    throw await readApiError(response);
  }
  return (await response.json()) as { space: SpaceDetailResponse['space']; invitation: { id: string; spaceId: string; invitedEmail: string | null; createdAt: string; expiresAt: string; revokedAt: string | null; acceptedAt: string | null; token?: string; url?: string } };
};

export const joinSpaceInvite = (token: string, inviteToken: string) =>
  apiFetch<JoinSpaceResponse>(`/api/spaces/invitations/${inviteToken}/join`, {
    method: 'POST',
    token
  });

export const fetchMySpaceInvitations = (token: string) => apiFetch<SpaceInvitationsResponse>('/api/me/space-invitations', { token });
