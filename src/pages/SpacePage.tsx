import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { LogOutIcon, PlusIcon, TrashIcon, UploadIcon } from '../components/ui/Icon';
import { useAuth } from '../features/auth/auth-context';
import { UploadDropzone, type UploadItemState } from '../features/items/UploadDropzone';
import { RecentItemsList } from '../features/items/RecentItemsList';
import { TextEditorModal } from '../features/items/TextEditorModal';
import { ExpirationModal } from '../features/items/ExpirationModal';
import type { Item } from '../features/items/types';
import {
  copySpaceText,
  createSpaceInvitation,
  createSpaceText,
  deleteSpace,
  deleteSpaceItem,
  downloadSpaceItem,
  fetchSpace,
  leaveSpace,
  removeSpaceMember,
  revokeSpaceInvitation,
  updateSpaceItemExpiration,
  updateSpaceText,
  uploadSpaceFile
} from '../features/spaces/spaces-api';
import type { SpaceDetailResponse } from '../../shared/types';
import { getInitials } from '../lib/format';
import { SPACE_EXPIRATION_TYPES } from '../../shared/constants';

type SpaceTextDraft = { title: string; content: string } | null;

const spacePageCache = new Map<string, SpaceDetailResponse>();

export const SpacePage = () => {
  const { session, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ spaceId: string }>();
  const spaceId = params.spaceId ?? '';
  const token = session?.access_token ?? '';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const cacheKey = user?.id && spaceId ? `${user.id}:${spaceId}` : '';
  const cachedPayload = cacheKey ? spacePageCache.get(cacheKey) : undefined;

  const [space, setSpace] = useState<SpaceDetailResponse['space'] | null>(cachedPayload?.space ?? null);
  const [members, setMembers] = useState<SpaceDetailResponse['members']>(cachedPayload?.members ?? []);
  const [items, setItems] = useState<Item[]>(cachedPayload?.items ?? []);
  const [invite, setInvite] = useState<SpaceDetailResponse['invite'] | null>(cachedPayload?.invite ?? null);
  const [loading, setLoading] = useState(!cachedPayload);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [uploadItems, setUploadItems] = useState<UploadItemState[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [pendingTextDraft, setPendingTextDraft] = useState<SpaceTextDraft>(null);
  const [textExpirationType, setTextExpirationType] = useState<(typeof SPACE_EXPIRATION_TYPES)[number]>('24_HOURS');
  const [expirationItem, setExpirationItem] = useState<Item | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'invite' | 'members'>('invite');

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-space-mobile-menu-toggle], [data-space-mobile-menu-panel]')) return;
      setMobileMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const uploadBusy = uploadItems.some((item) => item.status === 'queued' || item.status === 'uploading');
  const uploadStatus = uploadItems.length
    ? `${uploadItems.filter((item) => item.status === 'uploading').length} uploading, ${uploadItems.filter((item) => item.status === 'queued').length} queued`
    : null;

  const isOwner = space ? space.ownerId === user?.id : false;
  const memberCount = members.length;
  const activeInviteUrl = invite
    ? (() => {
        const invitePath = invite.url ?? (invite.token ? `/join/${invite.token}` : '');
        if (!invitePath) return null;
        try {
          return new URL(invitePath, window.location.origin).toString();
        } catch {
          return invitePath;
        }
      })()
    : null;

  const showAction = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2500);
  };

  const refresh = async () => {
    if (!token || !spaceId) return;
    const payload = await fetchSpace(token, spaceId);
    spacePageCache.set(cacheKey, payload);
    setSpace(payload.space);
    setMembers(payload.members);
    setItems(payload.items);
    setInvite(payload.invite ?? null);
  };

  useEffect(() => {
    if (!token || !spaceId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(!spacePageCache.has(`${user?.id ?? ''}:${spaceId}`));
    setError(null);

    fetchSpace(token, spaceId)
      .then((payload) => {
        if (controller.signal.aborted) return;
        spacePageCache.set(`${user?.id ?? ''}:${spaceId}`, payload);
        setSpace(payload.space);
        setMembers(payload.members);
        setItems(payload.items);
        setInvite(payload.invite ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load space.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [spaceId, token, user?.id]);

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
    uploadControllersRef.current.get(uploadId)?.abort();
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!token || !spaceId) return;
    const selectedFiles = files.filter((file) => file.size > 0);
    if (selectedFiles.length === 0) return;

    const uploads = selectedFiles.map((file) => ({ file, uploadId: addUploadItem(file) }));
    await Promise.allSettled(
      uploads.map(({ file, uploadId }) =>
        uploadSpaceFile(token, spaceId, file, '24_HOURS', (progress) => {
          updateUploadItem(uploadId, (item) => ({
            ...item,
            status: 'uploading',
            progress,
            message: `${progress}% uploaded`
          }));
        }, uploadControllersRef.current.get(uploadId)?.signal)
      )
    );
    await refresh();
    uploads.forEach(({ uploadId }) => removeUploadItem(uploadId, 1800));
  };

  const handleFileBrowse = (accept: string, inputRef: RefObject<HTMLInputElement | null>) => {
    const input = inputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  };

  const handleCreateText = () => {
    setEditingItem(null);
    setPendingTextDraft({ title: '', content: '' });
    setTextExpirationType('24_HOURS');
    setDraftOpen(true);
  };

  const handleEditText = (item: Item) => {
    setEditingItem(item);
    setPendingTextDraft(null);
    setDraftOpen(true);
  };

  const handleSaveText = async (payload: { id?: string; title: string; content: string }) => {
    if (!token || !spaceId) throw new Error('Missing session.');

    if (payload.id) {
      await updateSpaceText(token, spaceId, payload.id, { title: payload.title, content: payload.content });
      showAction('Text item updated.');
    } else {
      await createSpaceText(token, spaceId, {
        title: payload.title || 'Untitled note',
        content: payload.content,
        expirationType: textExpirationType
      });
      showAction('Text item saved.');
    }

    setPendingTextDraft(null);
    await refresh();
  };

  const handleDelete = async (item: Item) => {
    if (!token || !spaceId) return;
    try {
      await deleteSpaceItem(token, spaceId, item.id);
      await refresh();
      showAction('Item deleted.');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleDownload = async (item: Item) => {
    if (!token || !spaceId) return;
    try {
      const response = await downloadSpaceItem(token, spaceId, item.id);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file?.originalName ?? item.title;
      link.click();
      window.URL.revokeObjectURL(url);
      showAction('Download started.');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const handleCopy = async (item: Item) => {
    if (!token || !spaceId || !item.text?.content) return;
    try {
      await navigator.clipboard.writeText(item.text.content);
      await copySpaceText(token, spaceId, item.id);
      showAction('Text copied.');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Copy failed.');
    }
  };

  const handleChangeExpiration = (item: Item) => {
    setExpirationItem(item);
  };

  const filteredItems = useMemo(() => {
    const list = [...items].filter((item) => {
      if (!query.trim()) return true;
      const normalized = query.trim().toLowerCase();
      const title = item.title.toLowerCase();
      const content = item.text?.content.toLowerCase() ?? '';
      const filename = item.file?.originalName.toLowerCase() ?? '';
      return title.includes(normalized) || content.includes(normalized) || filename.includes(normalized);
    });

    list.sort((left, right) => {
      const delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === 'newest' ? -delta : delta;
    });

    return list;
  }, [items, query, sortOrder]);

  if (!authLoading && !session) return <Navigate to="/login" replace />;

  const handleSendEmailInvite = async () => {
    if (!token || !spaceId) return;
    const email = inviteEmail.trim();
    if (!email) {
      showAction('Enter an email address.');
      return;
    }
    try {
      setInviteBusy(true);
      await createSpaceInvitation(token, spaceId, email);
      setInviteEmail('');
      showAction(`Email invite created for ${email}.`);
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Email invite failed.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCreateInviteLink = async () => {
    if (!token || !spaceId) return;
    try {
      setInviteBusy(true);
      const response = await createSpaceInvitation(token, spaceId, null);
      setInvite(response.invitation);
      showAction('Invite link ready.');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Link creation failed.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRevokeInviteLink = async () => {
    if (!token || !spaceId) return;
    try {
      setInviteBusy(true);
      await revokeSpaceInvitation(token, spaceId);
      setInvite(null);
      showAction('Invite link revoked.');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Revoke failed.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!token || !spaceId) return;
    try {
      setBusy(true);
      await leaveSpace(token, spaceId);
      navigate('/spaces');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Leave failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!token || !spaceId) return;
    const confirmed = window.confirm(`Delete "${space?.name ?? 'this Space'}"?`);
    if (!confirmed) return;
    try {
      setBusy(true);
      await deleteSpace(token, spaceId);
      navigate('/spaces');
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!token || !spaceId) return;
    try {
      await removeSpaceMember(token, spaceId, memberId);
      await refresh();
    } catch (err: unknown) {
      showAction(err instanceof Error ? err.message : 'Remove failed.');
    }
  };

  const inviteSection = isOwner ? (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Invite</p>
      <div className="mt-2.5 space-y-2.5">
        <Input
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
          placeholder="name@example.com"
          className="h-10 rounded-2xl px-3.5 py-2.5 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-2xl px-2.5 text-[11px] whitespace-nowrap !text-black sm:px-3 sm:text-xs"
            onClick={() => void handleSendEmailInvite()}
            disabled={inviteBusy || !inviteEmail.trim()}
          >
            {inviteBusy ? <Spinner /> : 'Send email invite'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-2xl px-2.5 text-[11px] whitespace-nowrap sm:px-3 sm:text-xs"
            onClick={() => void handleCreateInviteLink()}
            disabled={inviteBusy || Boolean(activeInviteUrl)}
          >
            Create invite link
          </Button>
        </div>
        {activeInviteUrl ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
            <p className="font-medium text-slate-950">Active invite link</p>
            <p className="mt-1 break-all text-[11px] leading-5">{activeInviteUrl}</p>
          </div>
        ) : (
          <p className="text-[11px] leading-5 text-slate-500">Create a link invite once, then reuse the same join URL until it expires or is revoked.</p>
        )}
        {invite ? (
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-2xl px-2.5 text-[11px] whitespace-nowrap sm:px-3 sm:text-xs"
            onClick={() => void handleRevokeInviteLink()}
            disabled={inviteBusy}
          >
            Revoke invite link
          </Button>
        ) : null}
      </div>
    </section>
  ) : null;

  const membersSection = (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Members</p>
      <div className="mt-3 space-y-3">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-xs font-semibold text-white">
                {member.profilePicture ? <img src={member.profilePicture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : getInitials(member.displayName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{member.displayName}</p>
                <p className="text-xs text-slate-500">{member.role === 'owner' ? 'Owner' : 'Member'}</p>
              </div>
            </div>
            {isOwner && member.role !== 'owner' ? (
              <button type="button" className="text-sm font-medium text-rose-600" onClick={() => void handleRemoveMember(member.userId)}>
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-1.5rem)] w-full min-w-0 flex-col gap-6 pt-1 sm:pt-2 md:mx-auto md:max-w-6xl">
        <header className="relative flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/spaces')}
                className="h-14 w-14 shrink-0 rounded-full p-0"
                aria-label="Back to spaces"
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-[20px] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">{space?.name ?? 'Space'}</h1>
                <p className="mt-1 text-[13px] leading-5 text-slate-500">{memberCount} members</p>
              </div>
            </div>
          </div>

          <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-nowrap sm:gap-3 md:ml-auto">
            <Button type="button" variant="secondary" className="h-10 min-w-0 w-full px-2 text-xs leading-tight sm:w-auto sm:px-4 sm:text-sm" onClick={() => handleFileBrowse('', fileInputRef)} disabled={!token || uploadBusy}>
              <UploadIcon />
              Upload
            </Button>
            <Button type="button" variant="secondary" className="h-10 min-w-0 w-full px-2 text-xs leading-tight sm:w-auto sm:px-4 sm:text-sm" onClick={handleCreateText} disabled={!token}>
              <PlusIcon />
              New note
            </Button>
            {isOwner ? (
              <Button type="button" variant="secondary" className="col-span-2 h-10 min-w-0 w-full px-2 text-xs leading-tight sm:col-span-1 sm:w-auto sm:px-4 sm:text-sm" onClick={() => void handleDeleteSpace()} disabled={busy}>
                <TrashIcon />
                Delete Space
              </Button>
            ) : (
              <Button type="button" variant="secondary" className="col-span-2 h-10 min-w-0 w-full px-2 text-xs leading-tight sm:col-span-1 sm:w-auto sm:px-4 sm:text-sm" onClick={() => void handleLeave()} disabled={busy}>
                <LogOutIcon />
                Leave
              </Button>
            )}
          </div>

          <div className="absolute right-0 top-0 md:hidden">
            <Button
              type="button"
              variant="secondary"
              className="h-14 w-14 shrink-0 rounded-full p-0"
              aria-label="Space options"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
              data-space-mobile-menu-toggle
            >
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="5" r="1.45" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.45" fill="currentColor" stroke="none" />
                <circle cx="12" cy="19" r="1.45" fill="currentColor" stroke="none" />
              </svg>
            </Button>
            {mobileMenuOpen ? (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                role="menu"
                data-space-mobile-menu-panel
                onPointerDown={(event) => event.stopPropagation()}
              >
                {isOwner ? (
                  <button
                    type="button"
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                    role="menuitem"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobilePanel('invite');
                      setMobilePanelOpen(true);
                    }}
                  >
                    Invite
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMobilePanel('members');
                    setMobilePanelOpen(true);
                  }}
                >
                  Members
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {actionMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionMessage}</div> : null}

        {loading ? (
          <div className="grid w-full place-items-center rounded-[2rem] border border-slate-200/80 bg-white/80 py-16 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <Spinner />
          </div>
        ) : (
          <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-6">
              <UploadDropzone
                onUpload={handleUploadFiles}
                onBrowse={() => handleFileBrowse('', fileInputRef)}
                onCancelUpload={cancelUpload}
                disabled={!token || busy}
                busy={uploadBusy}
                uploads={uploadItems}
                status={uploadStatus}
              />

              <RecentItemsList
                items={filteredItems}
                loading={false}
                query={query}
                sortOrder={sortOrder}
                activeFilter="search"
                scope="space"
                searchInputRef={searchInputRef}
                message={null}
                onQueryChange={setQuery}
                onSortChange={setSortOrder}
                onFocusSearch={() => undefined}
                onEditText={handleEditText}
                onCopyText={handleCopy}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onChangeExpiration={handleChangeExpiration}
              />
            </div>

            <aside className="min-w-0 space-y-4">
              <div className="hidden md:block space-y-4">
                {inviteSection}
                {membersSection}
              </div>
            </aside>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void handleUploadFiles(files);
        }}
      />

      <TextEditorModal
        open={draftOpen}
        item={editingItem}
        draftTitle={pendingTextDraft?.title ?? ''}
        draftContent={pendingTextDraft?.content ?? ''}
        onClose={() => {
          setDraftOpen(false);
          setEditingItem(null);
          setPendingTextDraft(null);
        }}
        onSave={handleSaveText}
        expirationType={textExpirationType}
        onExpirationTypeChange={(value) => setTextExpirationType(value as (typeof SPACE_EXPIRATION_TYPES)[number])}
        allowConsume={false}
      />

      <ExpirationModal
        open={Boolean(expirationItem)}
        item={expirationItem}
        onClose={() => setExpirationItem(null)}
        onSave={async (itemId, expirationType) => {
          if (!token || !spaceId) return;
          await updateSpaceItemExpiration(token, spaceId, itemId, expirationType as (typeof SPACE_EXPIRATION_TYPES)[number]);
          await refresh();
        }}
        allowConsume={false}
      />

      <Modal
        title={mobilePanel === 'invite' ? 'Invite' : 'Members'}
        open={mobilePanelOpen}
        onClose={() => setMobilePanelOpen(false)}
      >
        {mobilePanel === 'invite' && isOwner ? inviteSection : membersSection}
      </Modal>
    </AppShell>
  );
};
