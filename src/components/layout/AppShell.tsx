import type { PropsWithChildren } from 'react';

export const AppShell = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_34%),radial-gradient(circle_at_80%_10%,_rgba(14,165,233,0.1),_transparent_28%),linear-gradient(180deg,_#fbfcff_0%,_#eef3fb_100%)] text-slate-900">
      <div className="mx-auto min-h-screen w-full max-w-[1440px] px-3 py-3 sm:px-5 sm:py-4 lg:px-6">{children}</div>
    </div>
  );
};
