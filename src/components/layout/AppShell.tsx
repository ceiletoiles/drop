import { useCallback, type PropsWithChildren } from 'react';
import { PullToRefresh } from '../ui/PullToRefresh';
import { PULL_TO_REFRESH_EVENT } from '../../lib/pull-to-refresh';

export const AppShell = ({ children }: PropsWithChildren) => {
  const handleRefresh = useCallback(async () => {
    // Refresh the mounted page in place. A document reload would restart
    // auth initialization and show the app's startup splash again.
    window.dispatchEvent(new Event(PULL_TO_REFRESH_EVENT));

    // Give the page refresh time to start before the indicator settles.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_34%),radial-gradient(circle_at_80%_10%,_rgba(14,165,233,0.1),_transparent_28%),linear-gradient(180deg,_#fbfcff_0%,_#eef3fb_100%)] text-slate-900">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen w-full min-w-0 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">{children}</div>
      </PullToRefresh>
    </div>
  );
};
