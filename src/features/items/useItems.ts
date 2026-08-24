import { useEffect, useState } from 'react';
import type { Item } from './types';
import { fetchItems } from './items-api';

const itemsCache = new Map<string, Item[]>();

interface UseItemsResult {
  items: Item[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useItems = (token: string | null, query: string, enabled = true): UseItemsResult => {
  const initialCacheKey = token ? `${token}:${query}` : '';
  const [items, setItems] = useState<Item[]>(initialCacheKey ? itemsCache.get(initialCacheKey) ?? [] : []);
  const [loading, setLoading] = useState(!initialCacheKey || !itemsCache.has(initialCacheKey));
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!token || !enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cacheKey = `${token}:${debouncedQuery}`;
    const cachedItems = itemsCache.get(cacheKey);
    if (cachedItems) {
      setItems(cachedItems);
      setLoading(false);
    }
    setError(null);

    fetchItems(token, debouncedQuery)
      .then((response) => {
        if (!controller.signal.aborted) {
          itemsCache.set(cacheKey, response.items);
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
  }, [debouncedQuery, enabled, reloadToken, token]);

  return {
    items,
    loading,
    error,
    refresh: () => setReloadToken((value) => value + 1)
  };
};
