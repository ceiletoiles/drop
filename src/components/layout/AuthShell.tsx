import type { PropsWithChildren } from 'react';

export const AuthShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f9_100%)]">
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[2.5rem] bg-slate-950 px-6 py-8 text-white shadow-glow sm:px-8 lg:min-h-[680px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-200/80">Drop</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              A lighter way to move things between your devices.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
              Drop keeps text and files close at hand without the weight of a full cloud drive. Sign in, drop
              something once, and pick it up elsewhere.
            </p>
          </div>
          <div className="grid gap-3 border-t border-white/10 pt-6 text-sm text-slate-300 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-white">Fast capture</p>
              <p className="mt-1">Paste a note or drop a file in seconds.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Private by default</p>
              <p className="mt-1">Each account only sees its own items.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Recent-first</p>
              <p className="mt-1">The latest items stay easiest to reach.</p>
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center">{children}</section>
      </div>
    </div>
  </div>
);
