import { useEffect, useState } from 'react';
import type { ActivityItem } from './types';
import { fetchActivities } from './activity-api';

interface UseActivityResult {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useActivity = (token: string | null, limit = 20): UseActivityResult => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!token) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchActivities(token, limit)
      .then((response) => {
        if (!controller.signal.aborted) {
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

