import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../features/auth/auth-context';
import { joinSpaceInvite, validateSpaceInvite } from '../features/spaces/spaces-api';

type InviteState = Awaited<ReturnType<typeof validateSpaceInvite>>;

export const JoinSpacePage = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ token: string }>();
  const token = params.token ?? '';

  const [invite, setInvite] = useState<InviteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    validateSpaceInvite(token)
      .then((response) => {
        if (!controller.signal.aborted) {
          setInvite(response);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Invite lookup failed.');
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [token]);

  if (!authLoading && !session) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-2xl items-center">
          <section className="w-full rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Space invite</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">You have been invited</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Log in or create an account to confirm the invitation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/login">
                <Button type="button">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button type="button" variant="secondary">Create account</Button>
              </Link>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  const handleJoin = async () => {
    if (!session) return;
    try {
      setJoinLoading(true);
      const response = await joinSpaceInvite(session.access_token, token);
      navigate(`/spaces/${response.space.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Join failed.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-2xl items-center">
        <section className="w-full rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : invite ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Space invite</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Join {invite.space.name}?</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {invite.space.memberCount} members and {invite.space.itemCount} items are already here.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" onClick={() => void handleJoin()} disabled={joinLoading}>
                  {joinLoading ? <Spinner /> : 'Join Space'}
                </Button>
                <Link to="/spaces">
                  <Button type="button" variant="secondary">Back to spaces</Button>
                </Link>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
};
