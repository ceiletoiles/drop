import type { PropsWithChildren } from 'react';
import { Button } from '../ui/Button';
import { getInitials } from '../../lib/format';
import { useAuth } from '../../features/auth/auth-context';

export const AppShell = ({ children }: PropsWithChildren) => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(15,23,42,0.08),_transparent_24%),linear-gradient(180deg,_#f7fafc_0%,_#eef3f9_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Drop</p>
            <h1 className="text-lg font-semibold text-slate-950">Drop something here</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full bg-slate-950 px-3 py-1.5 text-white sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">{getInitials(user?.email)}</span>
              <span className="max-w-44 truncate text-sm">{user?.email ?? 'Account'}</span>
            </div>
            <Button variant="secondary" type="button" onClick={() => void signOut()}>
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
