import type { ActivitiesResponse } from '../../../shared/types';
import { apiFetch } from '../../lib/http';

export const fetchActivities = (token: string, limit = 20) =>
  apiFetch<ActivitiesResponse>(`/api/activity?limit=${encodeURIComponent(String(limit))}`, { token });

