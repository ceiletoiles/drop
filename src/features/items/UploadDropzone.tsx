import { useRef, useState, type DragEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatFileSize } from '../../lib/format';

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
      className={`rounded-[2rem] border border-dashed p-5 transition ${
        dragging ? 'border-sky-400 bg-sky-50/80' : 'border-slate-200 bg-white/75'
      }`}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Drop zone</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Drop something here</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Upload a PDF, image, document, archive, or any ordinary file. On mobile, tap Browse files instead.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
            {busy ? <Spinner /> : 'Browse files'}
          </Button>
          <span className="text-sm text-slate-500">Max 25 MB</span>
        </div>
        {busy ? (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500">{progress}% uploaded</p>
          </div>
        ) : null}
        {status ? <p className="text-sm text-slate-600">{status}</p> : null}
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
    </div>
  );
};
