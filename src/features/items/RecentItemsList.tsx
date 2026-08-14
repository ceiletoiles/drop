import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Item } from './types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ChevronDownIcon, CopyIcon, DownloadIcon, FileIcon, ImageIcon, ListIcon, MoreHorizontalIcon, SearchIcon, TextIcon, TrashIcon } from '../../components/ui/Icon';
import { formatFileSize, formatRelativeTime } from '../../lib/format';
import { clsx } from 'clsx';

interface RecentItemsListProps {
  items: Item[];
  loading: boolean;
  query: string;
  sortOrder: 'newest' | 'oldest';
  activeFilter: 'home' | 'all' | 'text' | 'files' | 'images';
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onSortChange: (value: 'newest' | 'oldest') => void;
  onFocusSearch: () => void;
  onEditText: (item: Item) => void;
  onCopyText: (item: Item) => Promise<void>;
  onDelete: (item: Item) => Promise<void>;
  onDownload: (item: Item) => Promise<void>;
}

const iconForItem = (item: Item) => {
  if (item.type === 'text') return TextIcon;
  const mime = item.file?.mimeType ?? '';
  if (mime.includes('image')) return ImageIcon;
  if (mime.includes('pdf')) return FileIcon;
  return ListIcon;
};

const typeLabel = (item: Item) => {
  if (item.type === 'text') return 'Text';
  const mime = item.file?.mimeType ?? '';
  if (mime.includes('image')) return 'Image';
  if (mime.includes('pdf')) return 'PDF';
  return 'File';
};

export const RecentItemsList = ({
  items,
  loading,
  query,
  sortOrder,
  activeFilter,
  searchInputRef,
  onQueryChange,
  onSortChange,
  onFocusSearch,
  onEditText,
  onCopyText,
  onDelete,
  onDownload
}: RecentItemsListProps) => {
  const [menuState, setMenuState] = useState<{ itemId: string; top: number; left: number } | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
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

  const closeMenuOnOutsideTap = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-menu-toggle], [data-menu-panel], [data-sort-toggle], [data-sort-panel]')) return;
    setMenuState(null);
    setSortMenuOpen(false);
  };

  const toggleMenu = (event: ReactMouseEvent<HTMLButtonElement>, item: Item) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = item.type === 'text' ? 96 : 56;
    const viewportPadding = 8;
    const left = Math.min(Math.max(anchor.right - menuWidth, viewportPadding), window.innerWidth - menuWidth - viewportPadding);
    const belowTop = anchor.bottom + viewportPadding;
    const aboveTop = anchor.top - menuHeight - viewportPadding;
    const top = belowTop + menuHeight + viewportPadding > window.innerHeight && aboveTop >= viewportPadding ? aboveTop : belowTop;

    setMenuState((current) => (current?.itemId === item.id ? null : { itemId: item.id, top, left }));
  };

  return (
    <section ref={rootRef} className="pt-5" onPointerDownCapture={closeMenuOnOutsideTap}>
      <div className="flex flex-col gap-4 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:flex lg:min-h-12 lg:flex-col lg:justify-center">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-80">
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
          <div className="relative min-w-0 sm:w-52">
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full justify-between rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
              onClick={() => setSortMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
              data-sort-toggle
            >
              <span>{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
              <ChevronDownIcon className={clsx('text-slate-400 transition-transform', sortMenuOpen ? 'rotate-180' : '')} />
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
        </div>
      </div>

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
        <ul className="border-t border-slate-100">
          {items.map((item) => {
            const Icon = iconForItem(item);
            const isText = item.type === 'text';
            const isMenuOpen = menuState?.itemId === item.id;

            return (
              <li key={item.id} className="border-b border-slate-100 py-3">
                <div className="flex items-start gap-3 transition">
                  <button
                    type="button"
                    onClick={() => {
                      if (isText) onEditText(item);
                      if (!isText) void onDownload(item);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className={clsx(
                        'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
                        item.type === 'text'
                          ? 'bg-amber-50 text-amber-500'
                          : item.file?.mimeType.includes('image')
                            ? 'bg-emerald-50 text-emerald-500'
                            : 'bg-rose-50 text-rose-500'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600">{typeLabel(item)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.type === 'file' && item.file ? `${formatFileSize(item.file.size)} • ` : ''}
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2.5">
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
                                  onEditText(item);
                                }}
                              >
                                <TextIcon className="h-5 w-5" />
                                Edit
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
    </section>
  );
};
