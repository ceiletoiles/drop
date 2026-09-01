import { useState, type DragEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { PlusIcon } from '../../components/ui/Icon';
import { clsx } from 'clsx';

export interface UploadItemState {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  message?: string | null;
}

interface UploadDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
  onBrowse: () => void;
  onCancelUpload: (uploadId: string) => void;
  disabled?: boolean;
  busy?: boolean;
  uploads?: UploadItemState[];
  status?: string | null;
}

export const UploadDropzone = ({
  onUpload,
  onBrowse,
  onCancelUpload,
  disabled,
  busy = false,
  uploads = [],
  status = null
}: UploadDropzoneProps) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length && !disabled) {
      await onUpload(files);
    }
  };

  return (
    <div
      className={clsx(
        'w-full min-w-0 overflow-hidden rounded-[2rem] border border-dashed px-4 py-5 transition sm:px-5 sm:py-6',
        dragging ? 'border-indigo-400 bg-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.18)]' : 'border-[#8B7AE8] bg-[#F5F3FF]'
      )}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center text-center">
        <div className={clsx('grid h-12 w-12 place-items-center rounded-3xl', dragging ? 'bg-white text-indigo-600 shadow-sm' : 'bg-white/80 text-slate-700 shadow-sm')}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-cloud-upload-icon lucide-cloud-upload"
          >
            <path d="M12 13v8" />
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="m8 17 4-4 4 4" />
          </svg>
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.7rem]">
          {dragging ? 'Release to upload' : 'Drop files, images, or paste text'}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Drag one or more files here, paste text or images, or use the quick actions on the right.
        </p>
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <Button type="button" variant="secondary" onClick={onBrowse} disabled={disabled || busy} className="min-w-36 px-4 py-2.5">
            {busy ? <Spinner /> : <><PlusIcon /> Add something</>}
          </Button>
          <span className="text-xs text-slate-500">Max 25 MB</span>
        </div>

        {uploads.length > 0 ? (
          <div className="mt-4 w-full max-w-full min-w-0 space-y-2 overflow-hidden text-left">
            {uploads.map((upload) => (
              <div key={upload.id} className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5 shadow-sm">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-950" title={upload.name}>
                      {upload.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{Math.max(upload.size / 1024 / 1024, 0).toFixed(1)} MB</p>
                  </div>
                  <span
                    className={clsx(
                      'self-start rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] sm:shrink-0',
                      upload.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : upload.status === 'failed'
                          ? 'bg-rose-50 text-rose-700'
                          : upload.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-500'
                            : upload.status === 'uploading'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {upload.status}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full min-w-0 max-w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      upload.status === 'failed'
                        ? 'bg-rose-400'
                        : upload.status === 'cancelled'
                          ? 'bg-slate-300'
                          : upload.status === 'completed'
                            ? 'bg-emerald-500'
                            : 'bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)]'
                    )}
                    style={{ width: `${Math.min(Math.max(upload.progress, 0), 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex min-w-0 flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>{upload.message ?? (upload.status === 'completed' ? 'Uploaded' : upload.status === 'failed' ? 'Upload failed' : upload.status === 'cancelled' ? 'Cancelled' : 'Uploading')}</span>
                  <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                    <span>{Math.round(upload.progress)}%</span>
                    {upload.status === 'uploading' || upload.status === 'queued' ? (
                      <button
                        type="button"
                        className="font-medium text-rose-600 hover:text-rose-700"
                        onClick={() => onCancelUpload(upload.id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
      </div>
    </div>
  );
};
