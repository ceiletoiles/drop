import { useCallback, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { PullToRefresh } from '../ui/PullToRefresh';

export const AppShell = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();

  const handleRefresh = useCallback(async () => {
    // Re-navigate to the current path to trigger React Router re-mount,
    // which reloads all data the same way a page reload would.
    navigate(0);

    // Give the navigation time to flush before the indicator settles.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_34%),radial-gradient(circle_at_80%_10%,_rgba(14,165,233,0.1),_transparent_28%),linear-gradient(180deg,_#fbfcff_0%,_#eef3fb_100%)] text-slate-900">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen w-full min-w-0 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">{children}</div>
      </PullToRefresh>
    </div>
  );
};
