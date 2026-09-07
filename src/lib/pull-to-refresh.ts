import { useEffect, useRef } from 'react';

export const PULL_TO_REFRESH_EVENT = 'drop:pull-to-refresh';

export const usePullToRefresh = (onRefresh: () => void | Promise<void>) => {
  const callbackRef = useRef(onRefresh);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const handleRefresh = () => {
      void callbackRef.current();
    };

    window.addEventListener(PULL_TO_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(PULL_TO_REFRESH_EVENT, handleRefresh);
  }, []);
};
