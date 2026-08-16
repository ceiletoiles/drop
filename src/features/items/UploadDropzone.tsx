import { useRef, useState, type DragEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatFileSize } from '../../lib/format';
import { PlusIcon } from '../../components/ui/Icon';
import { clsx } from 'clsx';

interface UploadDropzoneProps {
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  disabled?: boolean;
}

export const UploadDropzone = ({ onUpload, disabled }: UploadDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setStatus(`${file.name} • ${formatFileSize(file.size)}`);
    try {
      await onUpload(file, setProgress);
      setStatus('Upload complete');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress(0);
      window.setTimeout(() => setStatus(null), 2200);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled && !busy) {
      await upload(file);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-[2rem] border border-dashed px-4 py-5 transition sm:px-5 sm:py-6',
        dragging
          ? 'border-indigo-300 bg-[linear-gradient(180deg,_rgba(239,246,255,0.9),_rgba(255,255,255,0.96))]'
          : 'border-indigo-200/90 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(244,247,255,0.95))]'
      )}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          id="Upload--Streamline-Outlined-Material"
          height="24"
          width="24"
          className="h-6 w-6 text-slate-950"
          aria-hidden="true"
        >
          <path
            fill="#000000"
            d="M11.25 16.175V6.9l-3 3 -1.075 -1.075L12 4l4.825 4.825 -1.075 1.075 -3 -3v9.275h-1.5ZM5.5 20c-0.4 0 -0.75 -0.15 -1.05 -0.45 -0.3 -0.3 -0.45 -0.65 -0.45 -1.05v-3.575h1.5V18.5h13v-3.575h1.5V18.5c0 0.4 -0.15 0.75 -0.45 1.05 -0.3 0.3 -0.65 0.45 -1.05 0.45H5.5Z"
            strokeWidth="0.5"
          />
        </svg>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.7rem]">Drop anything here</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Upload files, images, or create a text note from the quick actions below.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={disabled || busy} className="min-w-36 px-4 py-2.5">
            {busy ? <Spinner /> : <><PlusIcon /> Add something</>}
          </Button>
          <span className="text-xs text-slate-500">Max 25 MB</span>
        </div>

        {busy ? (
          <div className="mt-4 w-full max-w-md space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500">{progress}% uploaded</p>
          </div>
        ) : null}
        {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file && !disabled && !busy) {
            await upload(file);
          }
        }}
      />
    </div>
  );
};
