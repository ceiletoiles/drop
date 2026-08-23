import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FileTypeIcon } from '../components/ui/FileTypeIcon';
import { CopyIcon, DownloadIcon } from '../components/ui/Icon';
import { Spinner } from '../components/ui/Spinner';
import { formatFileSize } from '../lib/format';
import { getExpirationSummary } from '../lib/expiration';
import { getFileTypeKind } from '../lib/file';
import { apiUrl } from '../lib/env';
import { copySharedText, downloadSharedFile, fetchShare } from '../features/share/share-api';
import type { ShareResponse } from '../../shared/types';

export const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consumed, setConsumed] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!token) {
        setError('This shared Drop is no longer available.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const payload = await fetchShare(token);
        if (!active) return;
        setShare(payload);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'This shared Drop is no longer available.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [token]);

  const item = share?.item ?? null;
  const downloadUrl = useMemo(() => (token ? apiUrl(`/api/share/${token}/download`) : null), [token]);
  const isImage = item?.file ? getFileTypeKind({ filename: item.file.originalName, mimeType: item.file.mimeType }) === 'image' : false;
  const shareMetricLabel = item?.type === 'text' ? 'copies' : 'downloads';
  const emptyShareMetricLabel = item?.type === 'text' ? 'No copies yet' : 'No downloads yet';

  const showError = error ?? null;

  const handleDownload = async () => {
    if (!token || !share || !downloadUrl || !item) return;

    try {
      setBusy(true);
      const response = await downloadSharedFile(token);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = item.file?.originalName ?? item.title;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
      setError(null);
      setMessage(item.expirationType === 'CONSUME' ? 'Download complete. This Drop has been removed.' : 'Download started.');
      if (item.expirationType === 'CONSUME') {
        setConsumed(true);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Download failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!token || !share || !item?.text?.content) return;

    try {
      setBusy(true);
      await navigator.clipboard.writeText(item.text.content);
      await copySharedText(token);
      setShare((current) =>
        current && current.item.type === 'text'
          ? {
              ...current,
              share: {
                ...current.share,
                downloadCount: current.share.downloadCount + 1
              }
            }
          : current
      );
      setError(null);
      setMessage(item.expirationType === 'CONSUME' ? 'Copied. This Drop has been removed.' : 'Copied.');
      if (item.expirationType === 'CONSUME') {
        setConsumed(true);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Copy failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_38%),linear-gradient(180deg,_#f8fafc,_#eef2ff_72%,_#f8fafc)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <div className="w-full">
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-indigo-600">Drop share</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Temporary shared Drop</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This page is public and does not require a Drop account.
            </p>
          </div>

          <Card className="mx-auto max-w-2xl border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_100px_rgba(15,23,42,0.12)] sm:p-6">
            {loading ? (
              <div className="grid min-h-72 place-items-center text-slate-500">
                <Spinner />
              </div>
            ) : showError ? (
              <div className="grid min-h-72 place-items-center text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{showError}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    The link may have been revoked, expired, or removed by the owner.
                  </p>
                </div>
              </div>
            ) : item ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.5rem] bg-slate-100 text-slate-600">
                    <FileTypeIcon
                      itemType={item.type}
                      filename={item.file?.originalName}
                      mimeType={item.file?.mimeType}
                      className="h-8 w-8"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-2xl font-semibold tracking-tight text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.type === 'file' && item.file ? formatFileSize(item.file.size) : 'Text item'}
                      {' · '}
                      {getExpirationSummary(item.expirationType, item.expiresAt, item.type)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      {share ? `${share.share.downloadCount} ${shareMetricLabel}` : emptyShareMetricLabel}
                    </p>
                  </div>
                </div>

                {message ? <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

                {item.type === 'text' && item.text?.content ? (
                  <div className="space-y-3">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 px-4 py-4 text-[15px] leading-7 text-slate-50 shadow-inner sm:px-5">
                      <pre className="whitespace-pre-wrap break-words font-sans">{item.text.content}</pre>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button type="button" className="w-full sm:w-auto" onClick={handleCopy} disabled={busy || consumed}>
                        <CopyIcon />
                        Copy
                      </Button>
                      <p className="text-xs leading-5 text-slate-500">
                        Copying a shared note uses the same temporary expiration rules as the owner&apos;s item.
                      </p>
                    </div>
                  </div>
                ) : item.type === 'file' ? (
                  <div className="space-y-4">
                    {isImage && downloadUrl ? (
                      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
                        <img
                          src={downloadUrl}
                          alt={item.file?.originalName ?? item.title}
                          className="max-h-[34rem] w-full object-contain"
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-500">
                        {item.file ? (
                          <span>
                            {item.file.originalName}
                            {' · '}
                            {formatFileSize(item.file.size)}
                          </span>
                        ) : null}
                      </div>
                      <Button type="button" className="w-full sm:w-auto" onClick={handleDownload} disabled={busy || consumed}>
                        <DownloadIcon />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </main>
  );
};
