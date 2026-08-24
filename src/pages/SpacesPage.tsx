import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { GridIcon, HomeIcon, PlusIcon } from '../components/ui/Icon';
import { useAuth } from '../features/auth/auth-context';
import { createSpace, fetchSpaces } from '../features/spaces/spaces-api';
import type { SpaceSummary } from '../../shared/types';
import { getInitials } from '../lib/format';

export const SpacesPage = () => {
  const { session, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token ?? '';
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchSpaces(token)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSpaces(response.spaces);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load spaces.');
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [token]);

  if (!authLoading && !session) return <Navigate to="/login" replace />;

  const handleCreate = async () => {
    if (!token) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Space name is required.');
      return;
    }

    try {
      setCreateLoading(true);
      const response = await createSpace(token, { name: trimmed });
      setCreateOpen(false);
      setName('');
      navigate(`/spaces/${response.space.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col gap-6 pt-1 sm:pt-2">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Version 5</p>
            <h1 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">Spaces</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">
              Shared temporary areas for teams, friends, and quick project drops.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>
              <HomeIcon />
              Back to drop
            </Button>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Create Space
            </Button>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {loading ? (
          <div className="grid place-items-center rounded-[2rem] border border-slate-200/80 bg-white/80 py-16 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <Spinner />
          </div>
        ) : spaces.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,_rgba(99,102,241,0.12),_rgba(14,165,233,0.12))] text-indigo-600">
                <GridIcon />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950">No spaces yet</p>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                  Create a Space to share files, notes, and temporary items with a small group.
                </p>
                <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
                  <PlusIcon />
                  Create Space
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => navigate(`/spaces/${space.id}`)}
                className="text-left"
              >
                <article className="h-full rounded-[2rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.1)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-tight text-slate-950">{space.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{space.memberCount} members</p>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-sm font-semibold text-white">
                      {getInitials(space.ownerName)}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5">{space.itemCount} items</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5">Owner: {space.ownerName}</span>
                  </div>
                </article>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        title="Create Space"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setName('');
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                setName('');
              }}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={createLoading}>
              {createLoading ? <Spinner /> : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="College Friends" autoFocus />
          </label>
          <p className="text-sm leading-6 text-slate-500">A Space is a shared temporary area for a small group of users.</p>
        </div>
      </Modal>
    </AppShell>
  );
};
