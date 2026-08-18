import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import {
  ChevronDownIcon,
  FileIcon,
  HomeIcon,
  ImageIcon,
  ListIcon,
  LogOutIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  TextIcon,
  UserIcon,
  UploadIcon
} from '../components/ui/Icon';
import { useAuth } from '../features/auth/auth-context';
import { deleteItem, createTextItem, updateTextItem, uploadFile } from '../features/items/items-api';
import { RecentItemsList } from '../features/items/RecentItemsList';
import { TextEditorModal } from '../features/items/TextEditorModal';
import { UploadDropzone } from '../features/items/UploadDropzone';
import { useItems } from '../features/items/useItems';
import type { Item } from '../features/items/types';
import { apiUrl } from '../lib/env';
import { getFileTypeKind } from '../lib/file';
import { ApiBaseUrlBanner } from '../features/settings/ApiBaseUrlBanner';
import { formatFileSize, getInitials } from '../lib/format';
import { needsApiOverride } from '../lib/api-config';
import { clsx } from 'clsx';

type ViewFilter = 'home' | 'all' | 'text' | 'files' | 'images' | 'search';

const navItems: Array<{
  key: ViewFilter | 'search';
  label: string;
  icon: typeof HomeIcon;
  hint?: string;
}> = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'all', label: 'All items', icon: ListIcon },
  { key: 'text', label: 'Text notes', icon: TextIcon },
  { key: 'files', label: 'Files', icon: FileIcon },
  { key: 'images', label: 'Images', icon: ImageIcon },
  { key: 'search', label: 'Search', icon: SearchIcon }
];

const mobileNavItems: Array<{
  key: ViewFilter | 'search' | 'account';
  label: string;
  icon: typeof HomeIcon;
}> = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'all', label: 'All', icon: ListIcon },
  { key: 'all', label: 'Add', icon: PlusIcon },
  { key: 'search', label: 'Search', icon: SearchIcon },
  { key: 'account', label: 'Account', icon: UserIcon }
];

const mobileQuickActionButtonClass =
  'min-h-16 w-full items-center justify-start gap-2.5 rounded-[1.5rem] border border-slate-200/80 bg-transparent px-3 py-2.5 text-left text-slate-700 hover:bg-white/30';
const mobileQuickActionIconClass =
  'grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-slate-600';
const mobileQuickActionTextClass = 'min-w-0 flex-1 text-left';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const DashboardPage = () => {
  const { session, user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const apiConfigured = !needsApiOverride();
  const { items, loading, error, refresh } = useItems(session?.access_token ?? null, query, apiConfigured);

  const token = session?.access_token ?? '';
  const displayName = useMemo(() => {
    const raw = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Shiv';
    const normalized = raw.trim() || 'Shiv';
    return normalized
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part: string) => capitalize(part))
      .join(' ');
  }, [user?.email, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  useEffect(() => {
    if (activeFilter === 'search') {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [activeFilter]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const filteredItems = useMemo(() => {
    const list = [...items].filter((item) => {
      if (activeFilter === 'home' || activeFilter === 'all') return true;
      if (activeFilter === 'text') return item.type === 'text';
      const fileType = item.type === 'file'
        ? getFileTypeKind({ filename: item.file?.originalName, mimeType: item.file?.mimeType })
        : 'note';
      if (activeFilter === 'files') return item.type === 'file' && fileType !== 'image';
      if (activeFilter === 'images') return item.type === 'file' && fileType === 'image';
      return true;
    });

    list.sort((left, right) => {
      const delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === 'newest' ? -delta : delta;
    });

    return list;
  }, [activeFilter, items, sortOrder]);

  if (!authLoading && !session) return <Navigate to="/login" replace />;

  const showAction = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2500);
  };

  const handleCreateText = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleEditText = (item: Item) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleSaveText = async (payload: { id?: string; title: string; content: string }) => {
    if (!token) throw new Error('Missing session.');

    if (payload.id) {
      await updateTextItem(token, payload.id, { title: payload.title, content: payload.content });
      showAction('Text item updated.');
    } else {
      await createTextItem(token, { title: payload.title || 'Untitled note', content: payload.content });
      showAction('Text item saved.');
    }

    refresh();
  };

  const handleDelete = async (item: Item) => {
    try {
      if (!token) return;
      const confirmed = window.confirm(`Delete "${item.title}"?`);
      if (!confirmed) return;

      await deleteItem(token, item.id);
      refresh();
      showAction('Item deleted.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Delete failed.');
    }
  };

  const handleCopy = async (item: Item) => {
    try {
      if (!item.text?.content) return;
      await navigator.clipboard.writeText(item.text.content);
      showAction('Text copied.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Copy failed.');
    }
  };

  const handleDownload = async (item: Item) => {
    try {
      if (!token) return;
      const response = await fetch(apiUrl(`/api/files/${item.id}/download`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Download failed.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file?.originalName ?? item.title;
      link.click();
      window.URL.revokeObjectURL(url);
      showAction('Download started.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  const startUpload = async (file: File) => {
    if (!token) throw new Error('Missing session.');

    setUploadBusy(true);
    setUploadProgress(0);
    setUploadStatus(`${file.name} • ${formatFileSize(file.size)}`);

    try {
      await uploadFile(token, file, setUploadProgress);
      refresh();
      setUploadStatus('Upload complete');
      showAction('File uploaded.');
      window.setTimeout(() => setUploadStatus(null), 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setUploadStatus(message);
      showAction(message);
      window.setTimeout(() => setUploadStatus(null), 2200);
      throw error;
    } finally {
      setUploadBusy(false);
      setUploadProgress(0);
    }
  };

  const handleFileBrowse = (accept: string, inputRef: RefObject<HTMLInputElement | null>) => {
    const input = inputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  };

  const uploadSelectedFile = async (file: File) => {
    try {
      await startUpload(file);
    } catch (error) {
      void error;
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (!token) return;
      const text = await navigator.clipboard.readText();
      const content = text.trim();
      if (!content) throw new Error('Clipboard is empty.');
      const title = content.split('\n')[0]?.slice(0, 60) || 'Clipboard note';
      await createTextItem(token, { title, content });
      refresh();
      showAction('Clipboard saved as a note.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Paste failed.');
    }
  };

  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric'
      }).format(new Date(user.created_at))
    : 'Unknown';

  const navAction = (key: ViewFilter | 'search' | 'account') => {
    if (key === 'search') {
      setActiveFilter('search');
      setMobileActionsOpen(false);
      return;
    }
    if (key === 'account') {
      setMobileActionsOpen(false);
      setDrawerOpen(false);
      setAccountMenuOpen(false);
      navigate('/account');
      return;
    }
    setActiveFilter(key);
    setDrawerOpen(false);
    setMobileActionsOpen(false);
  };

  return (
    <AppShell>
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden xl:flex">
          <div className="flex min-h-full w-full flex-col pr-4">
            <div className="flex items-center gap-2.5">
              <div>
                <p className="text-[16px] font-semibold tracking-tight text-slate-950">Drop</p>
                <p className="text-[12px] text-slate-500">Everything in one place</p>
              </div>
            </div>

            <nav className="mt-6 space-y-1.5">
              {navItems.map(({ key, label, icon: Icon }) => {
                const active = activeFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navAction(key)}
                    className={clsx(
                      'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition',
                      active
                        ? 'bg-[linear-gradient(135deg,_rgba(99,102,241,0.12),_rgba(59,130,246,0.08))] text-indigo-600 ring-1 ring-indigo-200/80'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <span className={clsx('grid h-8 w-8 place-items-center rounded-xl', active ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600')}>
                      <Icon />
                    </span>
                    <span className="flex-1">{label}</span>
                  </button>
                );
              })}
            </nav>

          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 xl:pb-0">
          <header className="mb-3 pb-2.5 pt-1 sm:pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mt-2.5 xl:mt-0">
                  <p className="text-[20px] font-semibold tracking-tight text-slate-950 sm:text-[1.8rem]">Welcome back, {displayName}! 👋</p>
                  <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">Drop anything and access anywhere</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 xl:hidden"
                  aria-label="Open menu"
                >
                  <MenuIcon />
                </button>
                <div ref={accountMenuRef} className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((current) => !current)}
                    className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition hover:bg-slate-50"
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                      {getInitials(user?.email ?? displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-28 truncate text-sm font-medium text-slate-950">{displayName}</p>
                    </div>
                    <ChevronDownIcon className="text-slate-400" />
                  </button>

                  {accountMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          navigate('/account');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                          <UserIcon />
                        </span>
                        <span>
                          <span className="block font-medium text-slate-950">My account</span>
                          <span className="block text-xs text-slate-500">View profile</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setAccountMenuOpen(false);
                          await signOut();
                        }}
                        className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
                          <LogOutIcon />
                        </span>
                        <span>
                          <span className="block font-medium">Log out</span>
                          <span className="block text-xs text-rose-500">Sign out of this account</span>
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <ApiBaseUrlBanner onApplied={refresh} />

          <section className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-stretch">
              <UploadDropzone
                onUpload={startUpload}
                disabled={!token || uploadBusy}
                busy={uploadBusy}
                progress={uploadProgress}
                status={uploadStatus}
              />

              <div className="hidden grid-cols-1 gap-2 self-stretch xl:grid xl:h-full xl:min-h-0 xl:grid-rows-[repeat(4,minmax(0,1fr))]">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-start px-3 py-2.5 text-left !bg-transparent hover:!bg-slate-100 xl:h-full xl:min-h-0"
                  onClick={handleCreateText}
                  disabled={!token}
                  >
                  <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <TextIcon />
                  </span>
                  <span className="text-left">
                    <span className="block text-[13px] font-medium text-slate-950">Create text note</span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-start px-3 py-2.5 text-left !bg-transparent hover:!bg-slate-100 xl:h-full xl:min-h-0"
                  onClick={() => handleFileBrowse('', fileInputRef)}
                  disabled={!token}
                  >
                  <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <UploadIcon />
                  </span>
                  <span className="text-left">
                    <span className="block text-[13px] font-medium text-slate-950">Upload file</span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-start px-3 py-2.5 text-left !bg-transparent hover:!bg-slate-100 xl:h-full xl:min-h-0"
                  onClick={() => handleFileBrowse('image/*', imageInputRef)}
                  disabled={!token}
                  >
                  <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <ImageIcon />
                  </span>
                  <span className="text-left">
                    <span className="block text-[13px] font-medium text-slate-950">Upload image</span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-start px-3 py-2.5 text-left !bg-transparent hover:!bg-slate-100 xl:h-full xl:min-h-0"
                  onClick={() => void handlePasteClipboard()}
                  disabled={!token}
                  >
                  <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <PlusIcon />
                  </span>
                  <span className="text-left">
                    <span className="block text-[13px] font-medium text-slate-950">Paste from clipboard</span>
                  </span>
                </Button>
              </div>
            </div>

            <RecentItemsList
              items={filteredItems}
              loading={loading}
              query={query}
              sortOrder={sortOrder}
              activeFilter={activeFilter}
              message={actionMessage}
              onQueryChange={setQuery}
              onSortChange={setSortOrder}
              onFocusSearch={() => searchInputRef.current?.focus()}
              searchInputRef={searchInputRef}
              onEditText={handleEditText}
              onCopyText={handleCopy}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          </section>
        </div>
      </div>

      <div
        className={clsx(
          'fixed inset-0 z-40 xl:hidden',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={clsx('absolute inset-0 bg-slate-950/35 transition', drawerOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={clsx(
            'absolute left-0 top-0 h-full w-[86vw] max-w-sm rounded-r-[2rem] border-r border-white/60 bg-white/95 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.18)] backdrop-blur transition-transform',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-semibold tracking-tight text-slate-950">Drop</p>
                <p className="text-sm text-slate-500">Save and revisit anything</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              aria-label="Close menu"
            >
              <MenuIcon />
            </button>
          </div>

          <nav className="mt-8 space-y-1.5">
            {navItems.map(({ key, label, icon: Icon }) => {
              const active = activeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => navAction(key)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                    active ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/80' : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', active ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600')}>
                    <Icon />
                  </span>
                  <span className="flex-1">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(236,240,255,0.92))] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                {getInitials(user?.email ?? displayName)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-950">{displayName}</p>
                <p className="text-xs text-slate-500">{user?.email ?? 'Account'}</p>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => void signOut()} className="mt-4 w-full justify-center">
              <LogOutIcon />
              Logout
            </Button>
          </div>
        </aside>
      </div>

      {mobileActionsOpen ? (
        <button
          type="button"
          aria-label="Close quick actions"
          className="fixed inset-0 z-40 bg-slate-950/20 xl:hidden"
          onClick={() => setMobileActionsOpen(false)}
        />
      ) : null}

      <div
        className={clsx(
          'fixed inset-x-0 bottom-20 z-40 px-3 transition xl:hidden',
          mobileActionsOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        )}
        aria-hidden={!mobileActionsOpen}
      >
        <div className="mx-auto max-w-xl rounded-[1.75rem] border border-slate-200/70 bg-white/35 p-3 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              className={mobileQuickActionButtonClass}
              onClick={() => {
                setMobileActionsOpen(false);
                handleCreateText();
              }}
              disabled={!token}
            >
              <span className={mobileQuickActionIconClass}>
                <TextIcon className="h-5 w-5" />
              </span>
              <span className={mobileQuickActionTextClass}>
                <span className="block text-[12px] font-medium leading-4 text-slate-950">Create text note</span>
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={mobileQuickActionButtonClass}
              onClick={() => {
                setMobileActionsOpen(false);
                handleFileBrowse('', fileInputRef);
              }}
              disabled={!token}
            >
              <span className={mobileQuickActionIconClass}>
                <UploadIcon className="h-5 w-5" />
              </span>
              <span className={mobileQuickActionTextClass}>
                <span className="block text-[12px] font-medium leading-4 text-slate-950">Upload file</span>
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={mobileQuickActionButtonClass}
              onClick={() => {
                setMobileActionsOpen(false);
                handleFileBrowse('image/*', imageInputRef);
              }}
              disabled={!token}
            >
              <span className={mobileQuickActionIconClass}>
                <ImageIcon className="h-5 w-5" />
              </span>
              <span className={mobileQuickActionTextClass}>
                <span className="block text-[12px] font-medium leading-4 text-slate-950">Upload image</span>
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={mobileQuickActionButtonClass}
              onClick={() => {
                setMobileActionsOpen(false);
                void handlePasteClipboard();
              }}
              disabled={!token}
            >
              <span className={mobileQuickActionIconClass}>
                <PlusIcon className="h-5 w-5" />
              </span>
              <span className={mobileQuickActionTextClass}>
                <span className="block text-[12px] font-medium leading-4 text-slate-950">Paste from clipboard</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-3 py-2 shadow-[0_-10px_40px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-2">
          {mobileNavItems.map(({ key, label, icon: Icon }) => {
            const active = activeFilter === key;
            const isAdd = label === 'Add';
            return (
              <button
                key={`${key}-${label}`}
                type="button"
                onClick={() => {
                  if (isAdd) {
                    setMobileActionsOpen((current) => !current);
                    return;
                  }
                  navAction(key);
                }}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                  isAdd
                    ? 'relative -top-4 h-14 w-14 justify-self-center rounded-full bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] text-white shadow-[0_16px_30px_rgba(99,102,241,0.35)]'
                    : active
                      ? 'text-indigo-600'
                      : 'text-slate-500'
                )}
              >
                <span className={clsx(isAdd ? 'text-white' : active ? 'text-indigo-600' : 'text-slate-500')}>
                  <Icon />
                </span>
                <span className={clsx(isAdd && 'sr-only')}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <TextEditorModal
        open={editorOpen}
        item={editingItem}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveText}
        onDelete={async (itemId) => {
          try {
            if (!token) return;
            const current = items.find((entry) => entry.id === itemId);
            if (current && !window.confirm(`Delete "${current.title}"?`)) return;
            await deleteItem(token, itemId);
            refresh();
            setEditorOpen(false);
            showAction('Item deleted.');
          } catch (error) {
            showAction(error instanceof Error ? error.message : 'Delete failed.');
          }
        }}
      />

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file && token) {
            await uploadSelectedFile(file);
          }
        }}
      />
      <input
        ref={imageInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file && token) {
            await uploadSelectedFile(file);
          }
        }}
      />
    </AppShell>
  );
};
