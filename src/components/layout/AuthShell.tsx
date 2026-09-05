import type { PropsWithChildren } from 'react';

export const AuthShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f9_100%)]">
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-4 sm:px-6 sm:py-8 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4">
      <div className="grid w-full gap-6 lg:items-stretch lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col gap-8 rounded-[2.5rem] bg-[linear-gradient(135deg,_#dbeafe_0%,_#e0f2fe_48%,_#ecfeff_100%)] px-5 py-6 text-slate-950 shadow-glow sm:gap-10 sm:px-8 sm:py-8 lg:flex">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-700">Drop</p>
            <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:mt-4 sm:text-5xl">
              Move things between your devices.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:mt-4 sm:text-base">
              Keep text and files close at hand. Drop once, then pick them up anywhere.
            </p>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex sm:flex-col lg:flex-row">
            <img src="/assets/drop.png" alt="Drop" className="h-28 w-28 shrink-0 object-contain" />
            <div className="grid gap-4">
              <div>
                <p className="font-semibold text-slate-950">Fast capture</p>
                <p className="mt-1">Paste a note or drop a file in seconds.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Private by default</p>
                <p className="mt-1">Each account only sees its own items.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Recent-first</p>
                <p className="mt-1">The latest items stay easiest to reach.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center">{children}</section>
      </div>
    </div>
  </div>
);
