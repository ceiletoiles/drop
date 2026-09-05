import type { PropsWithChildren } from 'react';

export const AuthShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f9_100%)]">
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-4 sm:px-6 sm:py-8 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4">
      <div className="flex w-full justify-center">
        <section className="flex w-full items-center justify-center">{children}</section>
      </div>
    </div>
  </div>
);
