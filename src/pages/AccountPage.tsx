import { AppShell } from '../components/layout/AppShell';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useActivity } from '../features/activity/useActivity';
import type { ActivityItem } from '../features/activity/types';
import { useAuth } from '../features/auth/auth-context';
import { formatFileSize, formatRelativeTime, formatTimeUntil, getInitials } from '../lib/format';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type SVGProps } from 'react';
import { useItems } from '../features/items/useItems';
import { isImageFile } from '../lib/file';
import { fetchMySpaceInvitations } from '../features/spaces/spaces-api';
import { resolveAppUrl } from '../lib/app-url';
import { ArrowBackIcon } from '../components/ui/Icon';
import { clsx } from 'clsx';

type StorageCategory = 'files' | 'images' | 'text' | 'other';

type StorageRow = {
  id: string;
  title: string;
  size: number;
  kind: string;
};

const iconBaseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

const ThreeDotIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={clsx("h-5 w-5", className)} {...iconBaseProps} {...props}>
  <circle cx="12" cy="12" r="1" />
  <circle cx="12" cy="5" r="1" />
  <circle cx="12" cy="19" r="1" />
</svg>
);

const ActivityIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={clsx('h-5 w-5', className)} {...iconBaseProps} {...props}>
    <path d="M5 12H7.75044C7.89947 12 8.03179 11.9046 8.07892 11.7632V11.7632L9.875 6.375V6.375C9.91626 6.25122 10.0918 6.25238 10.1364 6.375V6.375L13.875 16.6562L13.885 16.6837C13.9253 16.7946 14.0812 16.797 14.125 16.6875V16.6875L15.8841 12.2898V12.2898C15.9541 12.1148 16.1236 12 16.3122 12H19" />
  </svg>
);

const panelClassName =
  'overflow-hidden rounded-none border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(251,252,255,0.92),_rgba(238,243,251,0.92))] p-4 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-5';

export const AccountPage = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { items } = useItems(session?.access_token ?? null, '', true);
  const { activities, loading: activityLoading, error: activityError } = useActivity(session?.access_token ?? null, 20);
  const [activeCategory, setActiveCategory] = useState<StorageCategory | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [spaceInvitations, setSpaceInvitations] = useState<Awaited<ReturnType<typeof fetchMySpaceInvitations>>['invitations']>([]);
  const [spaceInvitationsLoading, setSpaceInvitationsLoading] = useState(false);
  const [spaceInvitationsError, setSpaceInvitationsError] = useState<string | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'Your account';
  const email = user?.email ?? 'No email available';
  const profileImage =
    typeof user?.user_metadata?.picture === 'string'
      ? user.user_metadata.picture
      : typeof user?.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null;
  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric'
      }).format(new Date(user.created_at))
    : 'Unknown';

  const storageStats = useMemo(() => {
    const encodeTextSize = (value?: string | null) => new TextEncoder().encode(value ?? '').length;

    const imageItems: StorageRow[] = [];
    const fileItems: StorageRow[] = [];
    const textItems: StorageRow[] = [];
    const otherItems: StorageRow[] = [];

    for (const item of items) {
      if (item.type === 'file') {
        const size = item.file?.size ?? 0;
        const entry = {
          id: item.id,
          title: item.title,
          size,
          kind: isImageFile({ filename: item.file?.originalName, mimeType: item.file?.mimeType }) ? 'Image file' : 'File'
        };

        if (entry.kind === 'Image file') {
          imageItems.push(entry);
        } else {
          fileItems.push(entry);
        }
        continue;
      }

      if (item.type === 'text') {
        textItems.push({
          id: item.id,
          title: item.title,
          size: encodeTextSize(item.text?.content),
          kind: 'Text note'
        });
        continue;
      }

      otherItems.push({
        id: item.id,
        title: item.title,
        size: 0,
        kind: 'Other'
      });
    }

    const imageBytes = imageItems.reduce((total, item) => total + item.size, 0);
    const fileBytes = fileItems.reduce((total, item) => total + item.size, 0);
    const textBytes = textItems.reduce((total, item) => total + item.size, 0);
    const otherBytes = otherItems.reduce((total, item) => total + item.size, 0);

    return {
      totalBytes: imageBytes + fileBytes + textBytes + otherBytes,
      filesBytes: fileBytes,
      imageBytes,
      textBytes,
      otherBytes,
      imageItems,
      fileItems,
      textItems,
      otherItems
    };
  }, [items]);

  const activeCategoryConfig = useMemo(() => {
    if (!activeCategory) return null;

    const sortBySizeDesc = (rows: StorageRow[]) => [...rows].sort((left, right) => right.size - left.size);

    const configs: Record<StorageCategory, { title: string; rows: StorageRow[]; empty: string }> = {
      files: {
        title: 'Files only',
        rows: sortBySizeDesc(storageStats.fileItems),
        empty: 'No non-image files yet.'
      },
      images: {
        title: 'Images',
        rows: sortBySizeDesc(storageStats.imageItems),
        empty: 'No images uploaded yet.'
      },
      text: {
        title: 'Text notes',
        rows: sortBySizeDesc(storageStats.textItems),
        empty: 'No text notes yet.'
      },
      other: {
        title: 'Other',
        rows: sortBySizeDesc(storageStats.otherItems),
        empty: 'No items in this bucket yet.'
      }
    };

    return configs[activeCategory];
  }, [activeCategory, storageStats]);

  useEffect(() => {
    if (!session?.access_token) {
      setSpaceInvitations([]);
      setSpaceInvitationsLoading(false);
      setSpaceInvitationsError(null);
      return;
    }

    const controller = new AbortController();
    setSpaceInvitationsLoading(true);
    setSpaceInvitationsError(null);

    fetchMySpaceInvitations(session.access_token)
      .then((response) => {
        if (controller.signal.aborted) return;
        setSpaceInvitations(response.invitations);
        setSpaceInvitationsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setSpaceInvitationsError(err instanceof Error ? err.message : 'Failed to load space invites.');
        setSpaceInvitationsLoading(false);
      });

    return () => controller.abort();
  }, [session?.access_token]);

  useEffect(() => {
    if (!headerMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerMenuRef.current?.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHeaderMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [headerMenuOpen]);

  const getActivityActionLabel = (activity: ActivityItem) => {
    switch (activity.action) {
      case 'sign_in':
        return 'Signed in';
      case 'sign_out':
        return 'Signed out';
      case 'upload':
        return 'Uploaded';
      case 'create':
        return 'Created';
      case 'edit':
        return 'Edited';
      case 'delete':
        return 'Deleted';
      default:
        return 'Activity';
    }
  };

  const getActivityEntityLabel = (activity: ActivityItem) => {
    if (activity.action === 'sign_in' || activity.action === 'sign_out') {
      return '';
    }

    const entityKind =
      activity.entityKind ??
      (activity.itemType === 'text' ? 'note' : activity.itemType === 'file' ? 'file' : null);

    if (!entityKind) return '';

    if (entityKind === 'note') {
      return 'Note';
    }

    const detail = activity.entityDetail ? activity.entityDetail.toUpperCase() : '';

    if (entityKind === 'file') {
      return detail ? `${activity.title} - ${detail}` : activity.title;
    }

    return detail ? `Image - ${detail}` : 'Image';
  };

  const getActivityLabel = (activity: ActivityItem) => {
    if (activity.action === 'sign_in' || activity.action === 'sign_out') {
      return getActivityActionLabel(activity);
    }

    const parts = [getActivityActionLabel(activity), getActivityEntityLabel(activity)].filter(Boolean);
    return parts.join(' - ');
  };

  const getActivityMeta = (activity: ActivityItem) => {
    const parts: string[] = [];
    if (activity.sizeBytes && activity.sizeBytes > 0) {
      parts.push(formatFileSize(activity.sizeBytes));
    }
    parts.push(formatRelativeTime(activity.createdAt));
    return parts.join(' · ');
  };

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-3xl items-start py-1 sm:py-3">
        <div className="w-full space-y-4">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border-0 bg-transparent text-slate-700 shadow-none transition hover:bg-transparent hover:text-slate-950"
              aria-label="Go back"
            >
              <ArrowBackIcon className="!h-7 !w-7 !text-slate-700" />
            </button>
            <h1 className="justify-self-center text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Account</h1>
            <div ref={headerMenuRef} className="relative justify-self-end">
              <button
                type="button"
                onClick={() => setHeaderMenuOpen((current) => !current)}
                className="inline-flex h-14 w-14 items-center justify-center text-slate-700 transition hover:text-slate-950"
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={headerMenuOpen}
              >
                <ThreeDotIcon className="h-7 w-7" viewBox="0 0 24 24" />
              </button>

              {headerMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setActivityOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                    role="menuitem"
                  >
                    <ActivityIcon className="shrink-0 text-slate-600" viewBox="0 0 24 24" />
                    <span className="font-medium text-slate-950">Activity</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <section className={panelClassName}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-normal text-slate-700">Profile</p>
                <div className="mt-2 flex items-center gap-3 sm:gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 text-base font-semibold text-white shadow-[0_18px_40px_rgba(99,102,241,0.24)] sm:h-16 sm:w-16 sm:text-lg">
                    {profileImage && !profileImageError ? (
                      <img
                        src={profileImage}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      getInitials(email)
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex h-14 flex-col justify-between sm:h-16">
                      <p className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{displayName}</p>
                      <p className="truncate text-sm text-slate-600">{email}</p>
                      <p className="text-sm text-slate-500">Member since {memberSince}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {spaceInvitations.length > 0 ? (
            <section className={panelClassName}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-normal text-slate-700">Space invitations</p>
                </div>
              </div>

              {spaceInvitationsLoading ? (
                <div className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                  <Spinner />
                  Loading invites
                </div>
              ) : spaceInvitationsError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
                  {spaceInvitationsError}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {spaceInvitations.map(({ space, invitation }) => {
                    const inviteHref = resolveAppUrl(invitation.token ? `/join/${invitation.token}` : invitation.url ?? '');
                    return (
                      <div key={invitation.id} className="flex flex-col gap-3 rounded-[1rem] border border-slate-200/80 bg-white/75 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-950">{space.name}</p>
                          <p className="text-xs text-slate-500">Owned by {space.ownerName}</p>
                          <p className="mt-1 text-xs text-slate-500">Expires {formatTimeUntil(invitation.expiresAt)}</p>
                        </div>
                        {inviteHref ? (
                          <a
                            href={inviteHref}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-white"
                          >
                            Join invite
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section className={panelClassName}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-normal text-slate-700">Storage</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Used {formatFileSize(storageStats.totalBytes)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveCategory('files')}
                className="rounded-[1rem] border border-slate-200/80 bg-white/75 p-2.5 text-left transition hover:bg-white/90 sm:p-3"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">Files</p>
                <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-lg">{formatFileSize(storageStats.filesBytes)}</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('images')}
                className="rounded-[1rem] border border-slate-200/80 bg-white/75 p-2.5 text-left transition hover:bg-white/90 sm:p-3"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">Images</p>
                <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-lg">{formatFileSize(storageStats.imageBytes)}</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('text')}
                className="rounded-[1rem] border border-slate-200/80 bg-white/75 p-2.5 text-left transition hover:bg-white/90 sm:p-3"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">Text notes</p>
                <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-lg">{formatFileSize(storageStats.textBytes)}</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('other')}
                className="rounded-[1rem] border border-slate-200/80 bg-white/75 p-2.5 text-left transition hover:bg-white/90 sm:p-3"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">Other</p>
                <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-lg">{formatFileSize(storageStats.otherBytes)}</p>
              </button>
            </div>
          </section>
        </div>
      </div>

      <Modal
        title={activeCategoryConfig?.title ?? 'Storage'}
        open={activeCategory !== null}
        onClose={() => setActiveCategory(null)}
      >
        {activeCategoryConfig ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {activeCategoryConfig.rows.length} item{activeCategoryConfig.rows.length === 1 ? '' : 's'}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-950">
                {formatFileSize(activeCategoryConfig.rows.reduce((total, row) => total + row.size, 0))}
              </p>
            </div>

            {activeCategoryConfig.rows.length > 0 ? (
              <div className="space-y-2">
                {activeCategoryConfig.rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">{row.title}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-700">{formatFileSize(row.size)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {activeCategoryConfig.empty}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal title="Recent account activity" open={activityOpen} onClose={() => setActivityOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Showing the latest 20 activity events.</p>

          {activityError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
              {activityError}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{getActivityLabel(activity)}</p>
                    <p className="mt-1 text-xs text-slate-500">{getActivityMeta(activity)}</p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">{formatRelativeTime(activity.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : activityLoading ? null : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No activity yet.
            </div>
          )}
        </div>
      </Modal>
    </AppShell>
  );
};
