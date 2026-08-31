import { clsx } from 'clsx';

interface SplashScreenProps {
  className?: string;
}

export const SplashScreen = ({ className }: SplashScreenProps) => (
  <div
    style={{
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}
    className={clsx(
      'relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900',
      className
    )}
  >
    <div className="absolute -left-24 top-[-6rem] h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
    <div className="absolute -right-20 bottom-[-6rem] h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
    <div className="relative flex flex-col items-center px-6 text-center">
      <img src="/favicon_io/android-chrome-192x192.png" alt="" className="h-14 w-14" />
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-600">Drop</p>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">Loading your files, notes and spaces.</p>
      <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 animate-pulse" />
      </div>
    </div>
  </div>
);
