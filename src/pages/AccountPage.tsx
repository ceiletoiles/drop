import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { PencilIcon } from '../components/ui/Icon';
import { useAuth } from '../features/auth/auth-context';
import { getInitials } from '../lib/format';
import { Link } from 'react-router-dom';

export const AccountPage = () => {
  const { user } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'Your account';
  const email = user?.email ?? 'No email available';
  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric'
      }).format(new Date(user.created_at))
    : 'Unknown';

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-4xl items-start py-1 sm:py-3">
        <div className="w-full space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">My account</h1>
            <Link to="/" className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">
              Back to drop
            </Link>
          </div>

          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Profile</p>
                <div className="mt-3 flex items-center gap-4 sm:gap-5">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 text-lg font-semibold text-white shadow-[0_18px_40px_rgba(99,102,241,0.28)] sm:h-20 sm:w-20 sm:text-xl">
                    {getInitials(email)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex h-16 flex-col justify-between sm:h-20">
                      <p className="truncate text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{displayName}</p>
                      <p className="truncate text-sm text-slate-600">{email}</p>
                      <p className="text-sm text-slate-500">Member since {memberSince}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:self-center">
                <Button type="button" variant="secondary" className="px-4 py-2.5">
                  <PencilIcon />
                  Edit profile
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
};
