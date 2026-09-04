import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Item } from './types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { CalendarIcon, ClockIcon, CopyIcon, DownloadIcon, ExpirationIcon, FileIcon, ImageIcon, ListIcon, LockIcon, MoreHorizontalIcon, SearchIcon, ShareIcon, SortIcon, TextIcon, TrashIcon } from '../../components/ui/Icon';
import { FileTypeIcon } from '../../components/ui/FileTypeIcon';
import { formatFileSize, formatRelativeTime } from '../../lib/format';
import { getFileTypeKind, getFileTypeLabel } from '../../lib/file';
import { clsx } from 'clsx';
import { getExpirationSummary } from '../../lib/expiration';

const getRecentItemExpirationLabel = (item: Item) =>
  item.expirationType === 'CONSUME' ? 'Instant' : getExpirationSummary(item.expirationType, item.expiresAt, item.type);

interface RecentItemsListProps {
  items: Item[];
  loading: boolean;
  query: string;
  sortOrder: 'newest' | 'oldest';
  activeFilter: 'home' | 'all' | 'text' | 'files' | 'images' | 'search';
  searchInputRef: RefObject<HTMLInputElement | null>;
  message?: string | null;
  scope?: 'personal' | 'space';
  onQueryChange: (value: string) => void;
  onSortChange: (value: 'newest' | 'oldest') => void;
  onFocusSearch: () => void;
  onViewText: (item: Item) => void;
  onCopyText: (item: Item) => Promise<void>;
  onDelete: (item: Item) => Promise<void>;
  onDownload: (item: Item) => Promise<void>;
  onPreview?: (item: Item) => void;
  onShare?: (item: Item) => void;
  onChangeExpiration: (item: Item) => void;
}

export const RecentItemsList = ({
  items,
  loading,
  query,
  sortOrder,
  activeFilter,
  searchInputRef,
  message,
  scope = 'personal',
  onQueryChange,
  onSortChange,
  onFocusSearch,
  onViewText,
  onCopyText,
  onDelete,
  onDownload,
  onPreview,
  onShare,
  onChangeExpiration
}: RecentItemsListProps) => {
  const [menuState, setMenuState] = useState<{ itemId: string; top: number; left: number } | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<Item | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuState(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuState(null);
        setSortMenuOpen(false);
        setInfoItem(null);
      }
    };

    if (menuState || sortMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }

    return undefined;
  }, [menuState, sortMenuOpen]);

  const closeMenuOnOutsideTap = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-menu-toggle], [data-menu-panel], [data-sort-toggle], [data-sort-panel]')) return;
    setMenuState(null);
    setSortMenuOpen(false);
  };

  const toggleMenu = (event: ReactMouseEvent<HTMLButtonElement>, item: Item) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const isImage = item.type === 'file' && getFileTypeKind({ filename: item.file?.originalName, mimeType: item.file?.mimeType }) === 'image';
    const menuHeight = item.type === 'text' ? 184 : isImage && onPreview ? 136 : 96;
    const viewportPadding = 8;
    const left = Math.min(Math.max(anchor.right - menuWidth, viewportPadding), window.innerWidth - menuWidth - viewportPadding);
    const belowTop = anchor.bottom + viewportPadding;
    const aboveTop = anchor.top - menuHeight - viewportPadding;
    const top = belowTop + menuHeight + viewportPadding > window.innerHeight && aboveTop >= viewportPadding ? aboveTop : belowTop;

    setMenuState((current) => (current?.itemId === item.id ? null : { itemId: item.id, top, left }));
  };

  const sortControl = (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full p-0 text-slate-500 transition hover:text-slate-700"
        onClick={() => setSortMenuOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={sortMenuOpen}
        data-sort-toggle
        aria-label="Sort items"
      >
        <SortIcon className={clsx('transition-transform', sortMenuOpen ? 'rotate-180' : '')} />
      </Button>

      {sortMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          data-sort-panel
        >
          <button
            type="button"
            className={clsx(
              'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition',
              sortOrder === 'newest' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-100'
            )}
            onClick={() => {
              onSortChange('newest');
              setSortMenuOpen(false);
            }}
          >
            <span>Newest first</span>
            {sortOrder === 'newest' ? <span className="text-xs font-semibold">Active</span> : null}
          </button>
          <button
            type="button"
            className={clsx(
              'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition',
              sortOrder === 'oldest' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-100'
            )}
            onClick={() => {
              onSortChange('oldest');
              setSortMenuOpen(false);
            }}
          >
            <span>Oldest first</span>
            {sortOrder === 'oldest' ? <span className="text-xs font-semibold">Active</span> : null}
          </button>
        </div>
      ) : null}
    </div>
  );

  const shareLabel = infoItem
    ? scope === 'personal' && infoItem.share
      ? `Shared${infoItem.share.downloadCount > 0 ? ` · ${infoItem.share.downloadCount} ${infoItem.type === 'text' ? 'copies' : 'downloads'}` : ''}`
      : 'Not shared'
    : '';
  const infoSizeLabel = infoItem?.type === 'file' && infoItem.file ? formatFileSize(infoItem.file.size) : null;
  const infoCreatedDateLabel = infoItem?.createdAt ? new Date(infoItem.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const infoExpirationLabel = infoItem ? getExpirationSummary(infoItem.expirationType, infoItem.expiresAt, infoItem.type) : '';

  const headerCopy = (
    <div className="min-w-0 flex min-h-12 flex-col justify-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent items</p>
      <p className="mt-1 text-sm text-slate-500">
        {activeFilter === 'text'
          ? 'Showing text notes only.'
          : activeFilter === 'files'
            ? 'Showing uploaded files only.'
          : activeFilter === 'images'
              ? 'Showing uploaded images only.'
              : null}
      </p>
    </div>
  );

  return (
    <section ref={rootRef} className="w-full min-w-0 pt-5" onPointerDownCapture={closeMenuOnOutsideTap}>
      <div className="pb-3">
        <div className="flex items-center justify-between gap-3 sm:hidden">
          {headerCopy}
          {sortControl}
        </div>

        <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3">
          {headerCopy}
          <div className="flex items-center gap-3">
            {activeFilter === 'search' ? (
              <div className="relative min-w-0 w-80 flex-none">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Search your items..."
                  onFocus={onFocusSearch}
                  className="h-12 border-slate-200 bg-white/85 pl-10 pr-3 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-sky-400/25"
                />
              </div>
            ) : null}
            {sortControl}
          </div>
        </div>

        {activeFilter === 'search' ? (
          <div className="relative mt-3 min-w-0 sm:hidden">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search your items..."
              onFocus={onFocusSearch}
              className="h-12 border-slate-200 bg-white/85 pl-10 pr-3 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-sky-400/25"
            />
          </div>
        ) : null}
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      {loading ? (
        <div className="space-y-4 py-5">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Spinner />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 px-3 py-3 shadow-sm">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-11 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
            <ListIcon />
          </div>
          <p className="mt-3 text-base font-medium text-slate-950">No items yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {query ? 'No results matched your search.' : 'Drop a file or create a note to see it appear here.'}
          </p>
        </div>
      ) : (
        <ul className="min-w-0 divide-y divide-slate-200 border-t border-slate-200">
          {items.map((item) => {
            const isText = item.type === 'text';
            const isImage = item.type === 'file' && getFileTypeKind({ filename: item.file?.originalName, mimeType: item.file?.mimeType }) === 'image';
            const isMenuOpen = menuState?.itemId === item.id;

            return (
              <li key={item.id} className="min-w-0 py-3">
                <div className="flex min-w-0 items-start gap-3 transition">
                  <button
                    type="button"
                    onClick={() => {
                      if (isText) onViewText(item);
                      if (!isText) void onDownload(item);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
                  >
                    <FileTypeIcon
                      itemType={item.type}
                      filename={item.file?.originalName}
                      mimeType={item.file?.mimeType}
                      className="h-7 w-7 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-5 text-slate-950" title={item.title}>
                        {item.title}
                      </p>
                      <p className="scrollbar-hidden mt-1 flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden whitespace-nowrap text-[10px] leading-none text-slate-500 sm:gap-x-1.5 sm:text-xs">
                        <span className="shrink-0 text-[10px] font-medium leading-none text-indigo-600 sm:text-[11px]">
                          {getFileTypeLabel({ itemType: item.type, filename: item.file?.originalName, mimeType: item.file?.mimeType })}
                        </span>
                        <span className="inline-block h-0.5 w-0.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                        {item.type === 'file' && item.file ? <span className="shrink-0">{formatFileSize(item.file.size)}</span> : null}
                        {item.type === 'file' && item.file ? <span className="inline-block h-0.5 w-0.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" /> : null}
                        <span className="shrink-0">{formatRelativeTime(item.createdAt)}</span>
                        {scope === 'space' && item.uploadedByName ? (
                          <>
                            <span className="inline-block h-0.5 w-0.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                            <span className="shrink-0 text-slate-500">{`Uploaded by ${item.uploadedByName}`}</span>
                          </>
                        ) : null}
                        <span className="inline-block h-0.5 w-0.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                        <span className="flex shrink-0 items-center gap-1 text-slate-500">
                          <ExpirationIcon className="!h-2.5 !w-2.5 text-slate-500" />
                          <span className="shrink-0">{getRecentItemExpirationLabel(item)}</span>
                        </span>
                        {scope === 'personal' && item.share ? (
                          <>
                            <span className="inline-block h-0.5 w-0.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true"></span>
                            <span className="shrink-0 font-medium text-emerald-600">
                              {`Shared${item.share.downloadCount > 0 ? ` · ${item.share.downloadCount} ${item.type === 'text' ? 'copies' : 'downloads'}` : ''}`}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </button>

                  <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-2.5">
                    {isText ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 w-12 rounded-2xl p-0 text-slate-700 hover:bg-slate-100"
                        onClick={() => void onCopyText(item)}
                        aria-label="Copy text"
                      >
                        <CopyIcon className="h-6 w-6" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 w-12 rounded-2xl p-0 text-slate-700 hover:bg-slate-100"
                        onClick={() => void onDownload(item)}
                        aria-label="Download file"
                      >
                        <DownloadIcon className="h-6 w-6" />
                      </Button>
                    )}

                    {scope === 'personal' && onShare ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 w-12 rounded-2xl p-0 text-slate-700 hover:bg-slate-100"
                        onClick={() => onShare(item)}
                        aria-label={item.share ? 'Share again' : 'Share item'}
                      >
                        <ShareIcon className="h-6 w-6" />
                      </Button>
                    ) : null}

                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 w-12 rounded-2xl p-0 text-slate-500 hover:bg-slate-100"
                        onClick={(event) => toggleMenu(event, item)}
                        aria-label="More actions"
                        data-menu-toggle
                      >
                        <MoreHorizontalIcon className="h-6 w-6" />
                      </Button>

                      {isMenuOpen ? (
                        <div
                          className={clsx(
                            'fixed z-50 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]'
                          )}
                          style={{ top: menuState?.top ?? 0, left: menuState?.left ?? 0 }}
                          data-menu-panel
                        >
                          {isText ? (
                            <>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  onViewText(item);
                                }}
                              >
                                <TextIcon className="h-5 w-5" />
                                View
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  setInfoItem(item);
                                }}
                              >
                                <ListIcon className="h-5 w-5" />
                                Info
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  onChangeExpiration(item);
                                }}
                              >
                                <CalendarIcon className="h-5 w-5" />
                                Change expiration
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setMenuState(null);
                                  void onDelete(item);
                                }}
                              >
                                <TrashIcon className="h-5 w-5" />
                                Delete
                              </button>
                            </>
                          ) : isImage && onPreview ? (
                            <>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  onPreview?.(item);
                                }}
                              >
                                <ImageIcon className="h-5 w-5" />
                                Preview
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  setInfoItem(item);
                                }}
                              >
                                <ListIcon className="h-5 w-5" />
                                Info
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  onChangeExpiration(item);
                                }}
                              >
                                <CalendarIcon className="h-5 w-5" />
                                Change expiration
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setMenuState(null);
                                  void onDelete(item);
                                }}
                              >
                                <TrashIcon className="h-5 w-5" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  setInfoItem(item);
                                }}
                              >
                                <ListIcon className="h-5 w-5" />
                                Info
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                                onClick={() => {
                                  setMenuState(null);
                                  onChangeExpiration(item);
                                }}
                              >
                                <CalendarIcon className="h-5 w-5" />
                                Change expiration
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setMenuState(null);
                                  void onDelete(item);
                                }}
                              >
                                <TrashIcon className="h-5 w-5" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(infoItem)}
        title="Item info"
        onClose={() => setInfoItem(null)}
      >
        {infoItem ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] bg-[linear-gradient(180deg,_rgba(168,85,247,0.10),_rgba(147,197,253,0.12))] text-violet-500 ring-1 ring-violet-100">
                  <FileTypeIcon
                    itemType={infoItem.type}
                    filename={infoItem.file?.originalName}
                    mimeType={infoItem.file?.mimeType}
                    className="h-5 w-5"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[0.92rem] font-semibold tracking-tight text-slate-950 sm:text-[1rem]">{infoItem.title}</p>
                  <p className="mt-0.5 text-[0.8rem] text-slate-500">
                    {getFileTypeLabel({ itemType: infoItem.type, filename: infoItem.file?.originalName, mimeType: infoItem.file?.mimeType })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">About this item</p>

              <div className="space-y-2.5">
                <div className="flex items-stretch gap-2.5 rounded-[1.35rem] border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.03)]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.95rem] bg-violet-50 text-violet-500">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.86rem] font-semibold text-slate-950">File type</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.82rem] text-slate-700">
                      <span>{getFileTypeLabel({ itemType: infoItem.type, filename: infoItem.file?.originalName, mimeType: infoItem.file?.mimeType })}</span>
                      {infoItem.type === 'file' && infoItem.file ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.72rem] font-medium text-slate-700">
                          {infoItem.file.originalName.split('.').pop()?.toUpperCase() ?? 'FILE'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {infoSizeLabel ? (
                    <div className="shrink-0 text-right">
                      <p className="text-[0.95rem] font-semibold tracking-tight text-slate-950">{infoSizeLabel}</p>
                      <p className="mt-0.5 text-[0.68rem] text-slate-500">Size</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-stretch gap-2.5 rounded-[1.35rem] border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.03)]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.95rem] bg-sky-50 text-sky-500">
                    <ClockIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.86rem] font-semibold text-slate-950">Added {formatRelativeTime(infoItem.createdAt)}</p>
                    {infoCreatedDateLabel ? <p className="mt-0.5 text-[0.72rem] text-slate-500">{infoCreatedDateLabel}</p> : null}
                  </div>
                </div>

                <div className="flex items-stretch gap-2.5 rounded-[1.35rem] border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.03)]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.95rem] bg-emerald-50 text-emerald-500">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.86rem] font-semibold text-slate-950">Available for {infoExpirationLabel}</p>
                    <p className="mt-0.5 text-[0.72rem] leading-5 text-slate-500">Auto deletes after the expiration period.</p>
                  </div>
                </div>

                <div className="flex items-stretch gap-2.5 rounded-[1.35rem] border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.03)]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.95rem] bg-amber-50 text-amber-500">
                    <LockIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.86rem] font-semibold text-slate-950">Access {scope === 'space' ? 'Space members' : infoItem.share ? 'Shared' : 'Private'}</p>
                    <p className="mt-0.5 text-[0.72rem] leading-5 text-slate-500">
                      {scope === 'space'
                        ? 'Visible to every active member of this Space.'
                        : infoItem.share
                          ? 'Anyone with the link can open this item.'
                          : 'Only you can access this item.'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <div
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.72rem] font-medium',
                        scope === 'space' || infoItem.share ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      <LockIcon className="h-3 w-3" />
                      <span>{scope === 'space' ? 'Members only' : shareLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
};
