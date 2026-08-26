import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import type { Item } from './types';

interface ImagePreviewModalProps {
  open: boolean;
  item: Item | null;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export const ImagePreviewModal = ({ open, item, imageUrl, loading, error, onClose }: ImagePreviewModalProps) => (
  <Modal
    open={open}
    title={item?.title ? `Preview · ${item.title}` : 'Image preview'}
    onClose={onClose}
  >
    {item ? (
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-100 p-3">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-slate-500">
              <Spinner />
            </div>
          ) : error ? (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <p className="text-base font-semibold text-slate-950">{error}</p>
                <p className="mt-2 text-sm text-slate-500">The image could not be loaded for preview.</p>
              </div>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={item.file?.originalName ?? item.title}
              className="max-h-[70vh] w-full rounded-[1.25rem] object-contain"
            />
          ) : null}
        </div>

        <div className="space-y-1 text-sm text-slate-500">
          <p className="font-medium text-slate-950">{item.file?.originalName ?? item.title}</p>
          {item.file?.size ? <p>{item.file.size.toLocaleString()} bytes</p> : null}
        </div>
      </div>
    ) : null}
  </Modal>
);
