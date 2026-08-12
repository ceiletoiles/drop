import type { Item } from './types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatFileSize, formatRelativeTime } from '../../lib/format';

interface RecentItemsListProps {
  items: Item[];
  loading: boolean;
  onEditText: (item: Item) => void;
  onCopyText: (item: Item) => Promise<void>;
  onDelete: (item: Item) => Promise<void>;
  onDownload: (item: Item) => Promise<void>;
}

const iconForType = (item: Item) => {
  if (item.type === 'text') return '📝';
  const mime = item.file?.mimeType ?? '';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('image')) return '🖼';
  if (mime.includes('zip')) return '📦';
  return '📁';
};

export const RecentItemsList = ({
  items,
  loading,
  onEditText,
  onCopyText,
  onDelete,
  onDownload
}: RecentItemsListProps) => (
  <Card className="p-0">
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-lg font-semibold text-slate-950">Recent items</h2>
      <p className="mt-1 text-sm text-slate-500">Text and files live together here, newest first.</p>
    </div>
    {loading ? (
      <div className="space-y-3 px-5 py-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
    ) : items.length === 0 ? (
      <div className="px-5 py-10 text-center">
        <p className="text-base font-medium text-slate-950">No items yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Drop a file or create a note to see it appear here.
        </p>
      </div>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  if (item.type === 'text') onEditText(item);
                  if (item.type === 'file') void onDownload(item);
                }}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl">
                  {iconForType(item)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {item.type === 'text' ? 'Text' : item.file?.mimeType || 'File'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.type === 'file' && item.file ? `${formatFileSize(item.file.size)} • ` : ''}
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {item.type === 'text' ? (
                  <Button type="button" variant="secondary" onClick={() => void onCopyText(item)}>
                    Copy
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => void onDownload(item)}>
                    Download
                  </Button>
                )}
                {item.type === 'text' ? (
                  <Button type="button" variant="secondary" onClick={() => onEditText(item)}>
                    Edit
                  </Button>
                ) : null}
                <Button type="button" variant="danger" onClick={() => void onDelete(item)}>
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Card>
);
