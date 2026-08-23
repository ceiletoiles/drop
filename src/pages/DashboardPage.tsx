import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
import { consumeItem, deleteItem, createTextItem, updateExpirationItem, updateTextItem, uploadFile } from '../features/items/items-api';
import { RecentItemsList } from '../features/items/RecentItemsList';
import { ExpirationModal } from '../features/items/ExpirationModal';
import { TextEditorModal } from '../features/items/TextEditorModal';
import { UploadDropzone, type UploadItemState } from '../features/items/UploadDropzone';
import { useItems } from '../features/items/useItems';
import type { Item } from '../features/items/types';
import { apiUrl } from '../lib/env';
import { getFileTypeKind } from '../lib/file';
import { ApiBaseUrlBanner } from '../features/settings/ApiBaseUrlBanner';
import { formatFileSize, getInitials } from '../lib/format';
import { needsApiOverride } from '../lib/api-config';
import { clsx } from 'clsx';
import { DEFAULT_EXPIRATION_TYPE } from '../../shared/constants';
import type { ExpirationType } from '../../shared/types';

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

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || element.isContentEditable || Boolean(element.closest('[contenteditable="true"]'));
};

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
  const [pendingTextDraft, setPendingTextDraft] = useState<{ title: string; content: string } | null>(null);
  const [newTextExpirationType, setNewTextExpirationType] = useState<ExpirationType>(DEFAULT_EXPIRATION_TYPE);
  const [expirationItem, setExpirationItem] = useState<Item | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItemState[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const clipboardPasteHandlerRef = useRef<(event: ClipboardEvent) => void>(() => undefined);
  const apiConfigured = !needsApiOverride();
  const { items, loading, error, refresh } = useItems(session?.access_token ?? null, query, apiConfigured);

  const token = session?.access_token ?? '';
  const uploadBusy = uploadItems.some((item) => item.status === 'queued' || item.status === 'uploading');
  const uploadStatus = uploadItems.length
    ? `${uploadItems.filter((item) => item.status === 'uploading').length} uploading, ${uploadItems.filter((item) => item.status === 'queued').length} queued`
    : null;
  const displayName = useMemo(() => {
    const raw = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Shiv';
    const normalized = raw.trim() || 'Shiv';
    return normalized
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part: string) => capitalize(part))
      .join(' ');
  }, [user?.email, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  const showAction = useCallback((message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2500);
  }, []);

  const openTextDraft = useCallback((content: string) => {
    const normalized = content.replace(/\r\n/g, '\n');
    const title = normalized.split('\n').find((line) => line.trim().length > 0)?.trim().slice(0, 60) || 'Clipboard note';
    setEditingItem(null);
    setPendingTextDraft({ title, content: normalized });
    setNewTextExpirationType(DEFAULT_EXPIRATION_TYPE);
    setEditorOpen(true);
  }, []);

  const handlePasteClipboard = useCallback(async () => {
    try {
      if (!token) return;
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error('Clipboard is empty.');
      openTextDraft(text);
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Paste failed.');
    }
  }, [openTextDraft, showAction, token]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'escape') {
        setEditorOpen(false);
        setEditingItem(null);
        setPendingTextDraft(null);
        setDrawerOpen(false);
        setMobileActionsOpen(false);
        setAccountMenuOpen(false);
        return;
      }

      if (key === 'u') {
        event.preventDefault();
        handleFileBrowse('', fileInputRef);
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        handleCreateText();
        return;
      }

      if (key === 'v') {
        event.preventDefault();
        void handlePasteClipboard();
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        setActiveFilter('search');
        setMobileActionsOpen(false);
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePasteClipboard]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      clipboardPasteHandlerRef.current(event);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
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

  const handleCreateText = () => {
    setEditingItem(null);
    setPendingTextDraft({ title: '', content: '' });
    setNewTextExpirationType(DEFAULT_EXPIRATION_TYPE);
    setEditorOpen(true);
  };

  const handleEditText = (item: Item) => {
    setEditingItem(item);
    setPendingTextDraft(null);
    setEditorOpen(true);
  };

  const handleSaveText = async (payload: { id?: string; title: string; content: string }) => {
    if (!token) throw new Error('Missing session.');

    if (payload.id) {
      await updateTextItem(token, payload.id, { title: payload.title, content: payload.content });
      showAction('Text item updated.');
    } else {
      await createTextItem(token, {
        title: payload.title || 'Untitled note',
        content: payload.content,
        expirationType: newTextExpirationType
      });
      showAction('Text item saved.');
    }

    setPendingTextDraft(null);
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
      if (!token) throw new Error('Missing session.');
      if (!item.text?.content) return;
      await navigator.clipboard.writeText(item.text.content);
      if (item.expirationType === 'CONSUME') {
        try {
          await consumeItem(token, item.id);
          refresh();
          showAction('Text copied and removed.');
        } catch (error) {
          refresh();
          showAction(error instanceof Error ? `Text copied. ${error.message}` : 'Text copied, but delete failed.');
        }
        return;
      }
      showAction('Text copied.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Copy failed.');
    }
  };

  const handleDownload = async (item: Item) => {
    try {
      if (!token) throw new Error('Missing session.');
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
      if (item.expirationType === 'CONSUME') {
        try {
          await consumeItem(token, item.id);
          refresh();
          showAction('Download complete and removed.');
        } catch (error) {
          refresh();
          showAction(error instanceof Error ? `Download completed. ${error.message}` : 'Download completed, but delete failed.');
        }
        return;
      }
      showAction('Download started.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  const addUploadItem = (file: File): string => {
    const id = crypto.randomUUID();
    uploadControllersRef.current.set(id, new AbortController());
    setUploadItems((current) => [
      ...current,
      {
        id,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'queued',
        message: 'Queued'
      }
    ]);
    return id;
  };

  const updateUploadItem = (id: string, updater: (item: UploadItemState) => UploadItemState) => {
    setUploadItems((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  };

  const removeUploadItem = (id: string, delay = 0) => {
    window.setTimeout(() => {
      uploadControllersRef.current.delete(id);
      setUploadItems((current) => current.filter((item) => item.id !== id));
    }, delay);
  };

  const cancelUpload = (uploadId: string) => {
    const controller = uploadControllersRef.current.get(uploadId);
    if (!controller) return;
    controller.abort();
  };

  const startUpload = async (file: File, uploadId: string, signal?: AbortSignal) => {
    if (!token) throw new Error('Missing session.');

    updateUploadItem(uploadId, (item) => ({
      ...item,
      status: 'uploading',
      progress: 0,
      message: `${formatFileSize(file.size)} uploading`
    }));

    try {
      await uploadFile(token, file, DEFAULT_EXPIRATION_TYPE, (progress) => {
        updateUploadItem(uploadId, (item) => ({
          ...item,
          status: 'uploading',
          progress,
          message: `${progress}% uploaded`
        }));
      }, signal);
      refresh();
      updateUploadItem(uploadId, (item) => ({
        ...item,
        status: 'completed',
        progress: 100,
        message: 'Upload complete'
      }));
      showAction('File uploaded.');
      removeUploadItem(uploadId, 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      const cancelled = message === 'Upload cancelled.';
      updateUploadItem(uploadId, (item) => ({
        ...item,
        status: cancelled ? 'cancelled' : 'failed',
        message: cancelled ? 'Upload cancelled.' : message
      }));
      showAction(cancelled ? 'Upload cancelled.' : message);
      removeUploadItem(uploadId, cancelled ? 1800 : 3500);
      throw error;
    }
  };

  const handleFileBrowse = (accept: string, inputRef: RefObject<HTMLInputElement | null>) => {
    const input = inputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  };

  const handleUploadFiles = async (files: File[]) => {
    const selectedFiles = files.filter((file) => file.size > 0);
    if (selectedFiles.length === 0) return;

    const uploads = selectedFiles.map((file) => ({ file, uploadId: addUploadItem(file) }));
    try {
      await Promise.allSettled(
        uploads.map(({ file, uploadId }) => startUpload(file, uploadId, uploadControllersRef.current.get(uploadId)?.signal))
      );
    } catch (error) {
      void error;
    }
  };

  async function handleClipboardPaste(event: ClipboardEvent) {
    if (!token || isEditableTarget(event.target)) return;

    const files = Array.from(event.clipboardData?.files ?? []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      await handleUploadFiles(imageFiles);
      return;
    }

    const clipboardItems = Array.from(event.clipboardData?.items ?? []);
    const pastedFiles = clipboardItems
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (pastedFiles.length > 0) {
      await handleUploadFiles(pastedFiles);
      return;
    }

    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (text.trim()) {
      event.preventDefault();
      openTextDraft(text);
    }
  }

  clipboardPasteHandlerRef.current = (event: ClipboardEvent) => {
    void handleClipboardPaste(event);
  };

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

  const handleChangeExpiration = (item: Item) => {
    setExpirationItem(item);
  };

  const saveExpiration = async (itemId: string, expirationType: ExpirationType) => {
    if (!token) throw new Error('Missing session.');
    await updateExpirationItem(token, itemId, { expirationType });
    refresh();
    showAction('Expiration updated.');
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
                          try {
                            await signOut();
                            navigate('/login', { replace: true });
                          } catch (error) {
                            showAction(error instanceof Error ? error.message : 'Logout failed.');
                          }
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
                onUpload={handleUploadFiles}
                onBrowse={() => handleFileBrowse('', fileInputRef)}
                onCancelUpload={cancelUpload}
                disabled={!token}
                busy={uploadBusy}
                uploads={uploadItems}
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
              onChangeExpiration={handleChangeExpiration}
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
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                try {
                  await signOut();
                  navigate('/login', { replace: true });
                } catch (error) {
                  showAction(error instanceof Error ? error.message : 'Logout failed.');
                }
              }}
              className="mt-4 w-full justify-center"
            >
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
                void handlePasteClipboard();
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
                handleCreateText();
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
        draftTitle={pendingTextDraft?.title}
        draftContent={pendingTextDraft?.content}
        expirationType={newTextExpirationType}
        onExpirationTypeChange={setNewTextExpirationType}
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
      <ExpirationModal
        open={Boolean(expirationItem)}
        item={expirationItem}
        onClose={() => setExpirationItem(null)}
        onSave={saveExpiration}
      />

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        multiple
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length && token) {
            await handleUploadFiles(files);
          }
        }}
      />
      <input
        ref={imageInputRef}
        className="hidden"
        type="file"
        multiple
        accept="image/*"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length && token) {
            await handleUploadFiles(files);
          }
        }}
      />
    </AppShell>
  );
};
