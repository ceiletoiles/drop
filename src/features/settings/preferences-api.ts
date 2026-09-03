import type { UploadDefaultExpirationResponse, ExpirationType } from '../../../shared/types';
import { apiFetch } from '../../lib/http';

export const fetchUploadDefaultExpirationType = (token: string) =>
  apiFetch<UploadDefaultExpirationResponse>('/api/me/upload-default-expiration', {
    token
  });

export const updateUploadDefaultExpirationType = (token: string, uploadDefaultExpirationType: ExpirationType) =>
  apiFetch<UploadDefaultExpirationResponse>('/api/me/upload-default-expiration', {
    method: 'PATCH',
    token,
    body: JSON.stringify({ uploadDefaultExpirationType })
  });
