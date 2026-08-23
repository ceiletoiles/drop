import type { Item } from '../items/types';
import { Button } from '../../components/ui/Button';
import { FileTypeIcon } from '../../components/ui/FileTypeIcon';
import { Modal } from '../../components/ui/Modal';
import { CopyIcon, ShareIcon, TrashIcon } from '../../components/ui/Icon';
import { formatFileSize } from '../../lib/format';
import { getExpirationSummary } from '../../lib/expiration';

interface ShareModalProps {
  open: boolean;
  item: Item | null;
  shareUrl: string | null;
  downloadCount: number | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onCreateLink: () => void;
  onCopyLink: () => void;
  onRevoke: () => void;
}

export const ShareModal = ({
  open,
  item,
  shareUrl,
  downloadCount,
  loading,
  error,
  onClose,
  onCreateLink,
  onCopyLink,
  onRevoke
}: ShareModalProps) => {
  const hasActiveShare = Boolean(item?.share);
  const hasShareUrl = Boolean(shareUrl);
  const shareMetricLabel = item?.type === 'text' ? 'copies' : 'downloads';

  return (
    <Modal
      open={open}
      title="Share this Drop"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Shared links stay temporary and follow the item&apos;s existing expiration policy.
          </p>
        </div>
      }
    >
      {item ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4">
            <FileTypeIcon
              itemType={item.type}
              filename={item.file?.originalName}
              mimeType={item.file?.mimeType}
              className="h-10 w-10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {item.type === 'file' && item.file ? formatFileSize(item.file.size) : 'Text item'}
                {' · '}
                {getExpirationSummary(item.expirationType, item.expiresAt, item.type)}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-700">
                {downloadCount !== null
                  ? `${downloadCount} ${shareMetricLabel}`
                  : item.share
                    ? `${item.share.downloadCount} ${shareMetricLabel}`
                    : `No ${shareMetricLabel} yet`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white px-4 py-4 text-sm text-slate-500">
              Loading share link...
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
          ) : hasActiveShare ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="share-link">
                Temporary link
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="share-link"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
                  value={shareUrl ?? ''}
                  readOnly
                />
                <Button type="button" variant="secondary" onClick={onCopyLink} disabled={!hasShareUrl}>
                  <CopyIcon />
                  Copy link
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShareIcon className="h-4 w-4" />
                <span>The public page works without a Drop account.</span>
              </div>
              <Button type="button" variant="danger" onClick={onRevoke} className="w-full justify-center sm:w-auto">
                <TrashIcon />
                Revoke share
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white px-4 py-4 text-sm text-slate-500">
              <p>No active share link yet.</p>
              <Button type="button" variant="primary" onClick={onCreateLink} className="w-full justify-center sm:w-auto">
                Create link
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
