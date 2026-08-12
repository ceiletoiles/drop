import { useEffect, useState } from 'react';
import type { Item } from './types';
import { fetchItems } from './items-api';

interface UseItemsResult {
  items: Item[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useItems = (token: string | null, query: string): UseItemsResult => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchItems(token, query)
      .then((response) => {
        if (!controller.signal.aborted) {
          setItems(response.items);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load items.');
        }
      });

    return () => {
      controller.abort();
    };
  }, [query, reloadToken, token]);

  return {
    items,
    loading,
    error,
    refresh: () => setReloadToken((value) => value + 1)
  };
};
