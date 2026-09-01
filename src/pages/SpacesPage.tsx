import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { ArrowBackIcon, FileIcon, GridIcon, ImageIcon, LogOutIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/ui/Icon';
import { useAuth } from '../features/auth/auth-context';
import { createSpace, deleteSpace, fetchSpaces, leaveSpace, renameSpace } from '../features/spaces/spaces-api';
import type { SpaceSummary } from '../../shared/types';
import { formatRelativeTime, getInitials } from '../lib/format';
import { getFileTypeLabel, getFileTypeKind } from '../lib/file';

const spacesCache = new Map<string, { spaces: SpaceSummary[]; fetchedAt: number }>();
const SPACES_CACHE_TTL_MS = 2 * 60 * 1000;

export const SpacesPage = () => {
  const { session, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const token = session?.access_token ?? '';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [menuState, setMenuState] = useState<{ spaceId: string; top: number; left: number } | null>(null);
  const [renameSpaceId, setRenameSpaceId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    const cacheKey = user?.id ? `${user.id}:spaces` : '';
    const cachedPayload = cacheKey ? spacesCache.get(cacheKey) : undefined;

    if (!token) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    if (cachedPayload && Date.now() - cachedPayload.fetchedAt < SPACES_CACHE_TTL_MS) {
      setSpaces(cachedPayload.spaces);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    fetchSpaces(token)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSpaces(response.spaces);
          if (cacheKey) {
            spacesCache.set(cacheKey, { spaces: response.spaces, fetchedAt: Date.now() });
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          if (!cachedPayload) {
            setError(err instanceof Error ? err.message : 'Failed to load spaces.');
            setLoading(false);
          }
        }
      });

    return () => controller.abort();
  }, [token, user?.id]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-space-menu-toggle], [data-space-menu-panel]')) return;
      setMenuState(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuState(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      if (user?.id) {
        const cacheKey = `${user.id}:spaces`;
        const current = spacesCache.get(cacheKey)?.spaces ?? spaces;
        spacesCache.set(cacheKey, { spaces: [response.space, ...current], fetchedAt: Date.now() });
      }
      setCreateOpen(false);
      setName('');
      navigate(`/spaces/${response.space.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setCreateLoading(false);
    }
  };

  const openSpaceMenu = (event: ReactMouseEvent<HTMLButtonElement>, space: SpaceSummary) => {
    event.stopPropagation();
    const anchor = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 96;
    const viewportPadding = 8;
    const left = Math.min(Math.max(anchor.right - menuWidth, viewportPadding), window.innerWidth - menuWidth - viewportPadding);
    const belowTop = anchor.bottom + viewportPadding;
    const aboveTop = anchor.top - menuHeight - viewportPadding;
    const top = belowTop + menuHeight + viewportPadding > window.innerHeight && aboveTop >= viewportPadding ? aboveTop : belowTop;

    setMenuState((current) => (current?.spaceId === space.id ? null : { spaceId: space.id, top, left }));
  };

  const openRenameSpace = (space: SpaceSummary) => {
    setMenuState(null);
    setRenameSpaceId(space.id);
    setRenameName(space.name);
  };

  const closeRenameSpace = () => {
    setRenameSpaceId(null);
    setRenameName('');
  };

  const handleRenameSpace = async () => {
    if (!token || !renameSpaceId) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setError('Space name is required.');
      return;
    }

    try {
      setRenameLoading(true);
      const response = await renameSpace(token, renameSpaceId, trimmed);
      setSpaces((current) => current.map((space) => (space.id === renameSpaceId ? response.space : space)));
      if (user?.id) {
        const cacheKey = `${user.id}:spaces`;
        const current = spacesCache.get(cacheKey)?.spaces ?? spaces;
        spacesCache.set(cacheKey, {
          spaces: current.map((space) => (space.id === renameSpaceId ? response.space : space)),
          fetchedAt: Date.now()
        });
      }
      closeRenameSpace();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rename failed.');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteSpace = async (space: SpaceSummary) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete "${space.name}"?`);
    if (!confirmed) return;

    try {
      await deleteSpace(token, space.id);
      setSpaces((current) => current.filter((entry) => entry.id !== space.id));
      if (user?.id) {
        const cacheKey = `${user.id}:spaces`;
        const current = spacesCache.get(cacheKey)?.spaces ?? spaces;
        spacesCache.set(cacheKey, { spaces: current.filter((entry) => entry.id !== space.id), fetchedAt: Date.now() });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleLeaveSpace = async (space: SpaceSummary) => {
    if (!token) return;
    const confirmed = window.confirm(`Leave "${space.name}"?`);
    if (!confirmed) return;

    try {
      await leaveSpace(token, space.id);
      setSpaces((current) => current.filter((entry) => entry.id !== space.id));
      if (user?.id) {
        const cacheKey = `${user.id}:spaces`;
        const current = spacesCache.get(cacheKey)?.spaces ?? spaces;
        spacesCache.set(cacheKey, { spaces: current.filter((entry) => entry.id !== space.id), fetchedAt: Date.now() });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Leave failed.');
    }
  };

  return (
    <AppShell>
      <div ref={rootRef} className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col gap-6 pt-1 sm:pt-2">
        <header className="relative flex items-start justify-center gap-4 pt-1 sm:pt-2">
          <div className="absolute left-0 top-0 sm:top-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/')}
              className="h-12 w-12 shrink-0 rounded-full border-0 bg-transparent p-0 text-black shadow-none hover:bg-transparent"
              aria-label="Back to drop"
            >
              <ArrowBackIcon className="h-7 w-7" />
            </Button>
          </div>

          <div className="min-w-0 max-w-2xl px-16 text-center sm:px-24">
            <h1 className="text-[20px] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">Spaces</h1>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Shared temporary areas for teams, friends, and quick project drops.
            </p>
          </div>

          <div className="absolute right-0 top-0 hidden sm:top-1 md:block">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
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
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-1.5">
            <div className="md:hidden">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)} className="w-full">
                <PlusIcon className="h-4 w-4" />
                Create Space
              </Button>
            </div>

            <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Your spaces</p>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {spaces.map((space) => (
                <article
                  key={space.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${space.name}`}
                  onClick={() => navigate(`/spaces/${space.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/spaces/${space.id}`);
                    }
                  }}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/85 shadow-[0_18px_52px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,_rgba(129,140,248,0.26),_rgba(168,85,247,0.18))] text-indigo-600">
                          <GridIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold tracking-tight text-slate-950">{space.name}</p>
                        </div>
                      </div>

                      <div className="relative z-20">
                        <Button
                          type="button"
                          variant="ghost"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl p-0 text-slate-500 hover:bg-slate-100"
                          onClick={(event) => openSpaceMenu(event, space)}
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          aria-label={`Space actions for ${space.name}`}
                          aria-haspopup="menu"
                          aria-expanded={menuState?.spaceId === space.id}
                          data-space-menu-toggle
                        >
                          <MoreHorizontalIcon />
                        </Button>

                        {menuState?.spaceId === space.id ? (
                          <div
                            className="fixed z-40 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                            style={{ top: menuState.top, left: menuState.left }}
                            data-space-menu-panel
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {space.ownerId === user?.id ? (
                              <>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                  onClick={() => openRenameSpace(space)}
                                >
                                  <PencilIcon className="h-5 w-5" />
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                                  onClick={() => {
                                    setMenuState(null);
                                    void handleDeleteSpace(space);
                                  }}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                  Delete
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setMenuState(null);
                                  void handleLeaveSpace(space);
                                }}
                              >
                                <LogOutIcon className="h-5 w-5" />
                                Leave
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        {(space.memberPreviews && space.memberPreviews.length > 0 ? space.memberPreviews : [{ userId: space.ownerId, displayName: space.ownerName }]).slice(0, 3).map((member) => (
                          <span
                            key={member.userId}
                            className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-white bg-indigo-300 text-xs font-semibold text-white"
                          >
                            {member.profilePicture ? (
                              <img src={member.profilePicture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              getInitials(member.displayName).slice(0, 1)
                            )}
                          </span>
                        ))}
                        {space.memberCount > 3 ? (
                          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-500">+{space.memberCount - 3}</span>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium text-slate-600">{space.memberCount} members</p>
                    </div>
                  </div>

                  <div className="border-y border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                      {Array.from({ length: 2 }).map((_, index) => {
                        const recentItem = space.recentItems?.[index];
                        if (!recentItem) {
                          return <div key={`empty-${space.id}-${index}`} className="min-h-0" />;
                        }

                        const kind = getFileTypeKind({
                          itemType: recentItem.type,
                          filename: recentItem.filename,
                          mimeType: recentItem.mimeType
                        });

                        const toneClass = kind === 'image' ? 'bg-emerald-100 text-emerald-500' : kind === 'pdf' ? 'bg-rose-100 text-rose-500' : 'bg-sky-100 text-sky-600';

                        return (
                          <div key={recentItem.id} className="flex min-w-0 items-center gap-2">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
                              {kind === 'image' ? <ImageIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium text-slate-900">
                                {getFileTypeLabel({ itemType: recentItem.type, filename: recentItem.filename, mimeType: recentItem.mimeType })}
                              </span>
                              <span className="block text-xs text-slate-500">{formatRelativeTime(recentItem.updatedAt)}</span>
                            </span>
                          </div>
                        );
                      })}

                      <span className="justify-self-end rounded-full bg-[linear-gradient(135deg,_rgba(129,140,248,0.15),_rgba(168,85,247,0.12))] px-3 py-1 text-xs font-medium text-indigo-600">
                        {space.itemCount} items
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 text-indigo-600">
                    <span className="text-base font-medium">Open Space</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </div>
                </article>
              ))}
            </div>
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

      <Modal
        title="Rename Space"
        open={Boolean(renameSpaceId)}
        onClose={closeRenameSpace}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeRenameSpace} disabled={renameLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleRenameSpace()} disabled={renameLoading}>
              {renameLoading ? <Spinner /> : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Space name</span>
            <Input value={renameName} onChange={(event) => setRenameName(event.target.value)} autoFocus />
          </label>
        </div>
      </Modal>
    </AppShell>
  );
};
