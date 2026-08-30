import { useEffect, useState } from 'react';
import type { ActivityItem } from './types';
import { fetchActivities } from './activity-api';

const activityCache = new Map<string, ActivityItem[]>();

interface UseActivityResult {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useActivity = (token: string | null, limit = 20): UseActivityResult => {
  const cacheKey = token ? `${token}:${limit}` : '';
  const [activities, setActivities] = useState<ActivityItem[]>(cacheKey ? activityCache.get(cacheKey) ?? [] : []);
  const [loading, setLoading] = useState(!cacheKey || !activityCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!token) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cacheKey = `${token}:${limit}`;
    const cachedActivities = activityCache.get(cacheKey);
    if (cachedActivities) {
      setActivities(cachedActivities);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    fetchActivities(token, limit)
      .then((response) => {
        if (!controller.signal.aborted) {
          activityCache.set(cacheKey, response.activities);
          setActivities(response.activities);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load activity.');
        }
      });

    return () => {
      controller.abort();
    };
  }, [limit, reloadToken, token]);

  return {
    activities,
    loading,
    error,
    refresh: () => setReloadToken((value) => value + 1)
  };
};
