import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../features/auth/auth-context';
import { deleteItem, createTextItem, updateTextItem, uploadFile } from '../features/items/items-api';
import { RecentItemsList } from '../features/items/RecentItemsList';
import { TextEditorModal } from '../features/items/TextEditorModal';
import { UploadDropzone } from '../features/items/UploadDropzone';
import { useItems } from '../features/items/useItems';
import type { Item } from '../features/items/types';
import { apiUrl } from '../lib/env';
import { ApiBaseUrlBanner } from '../features/settings/ApiBaseUrlBanner';
import { needsApiOverride } from '../lib/api-config';

export const DashboardPage = () => {
  const { session, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const apiConfigured = !needsApiOverride();
  const { items, loading, error, refresh } = useItems(session?.access_token ?? null, query, apiConfigured);

  if (!authLoading && !session) return <Navigate to="/login" replace />;

  const token = session?.access_token ?? '';

  const showAction = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2500);
  };

  const handleCreateText = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleEditText = (item: Item) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleSaveText = async (payload: { id?: string; title: string; content: string }) => {
    if (!token) throw new Error('Missing session.');

    if (payload.id) {
      await updateTextItem(token, payload.id, { title: payload.title, content: payload.content });
      showAction('Text item updated.');
    } else {
      await createTextItem(token, { title: payload.title || 'Untitled note', content: payload.content });
      showAction('Text item saved.');
    }

    refresh();
  };

  const handleDelete = async (item: Item) => {
    try {
      if (!token) return;
      const confirmed = window.confirm(`Delete "${item.title}"?`);
      if (!confirmed) return;

      await deleteItem(token, item.id);
      refresh();
      showAction('Item deleted.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Delete failed.');
    }
  };

  const handleCopy = async (item: Item) => {
    try {
      if (!item.text?.content) return;
      await navigator.clipboard.writeText(item.text.content);
      showAction('Text copied.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Copy failed.');
    }
  };

  const handleDownload = async (item: Item) => {
    try {
      if (!token) return;
      const response = await fetch(apiUrl(`/api/files/${item.id}/download`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Download failed.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file?.originalName ?? item.title;
      link.click();
      window.URL.revokeObjectURL(url);
      showAction('Download started.');
    } catch (error) {
      showAction(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  const handleUpload = async (file: File, onProgress: (percent: number) => void) => {
    if (!token) throw new Error('Missing session.');
    await uploadFile(token, file, onProgress);
    refresh();
    showAction('File uploaded.');
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <ApiBaseUrlBanner onApplied={refresh} />
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <UploadDropzone onUpload={handleUpload} disabled={!token} />
            <div className="rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Quick note</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Paste text and save it quickly</h2>
                </div>
                <Button type="button" onClick={handleCreateText}>
                  + Add text
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Notes are stored in PostgreSQL, so they stay searchable and instant to reopen from another device.
              </p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/60 bg-slate-950 p-5 text-white shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200/80">Search</p>
            <h2 className="mt-2 text-2xl font-semibold">Find any recent item</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Search titles, note content, and filenames across your own items.
            </p>
            <div className="mt-5">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes and files"
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:ring-sky-400/30"
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/8 p-4">
                <p className="text-sm text-slate-300">Recent items</p>
                <p className="mt-1 text-2xl font-semibold">{items.length}</p>
              </div>
              <div className="rounded-3xl bg-white/8 p-4">
                <p className="text-sm text-slate-300">Ready state</p>
                <p className="mt-1 text-2xl font-semibold">{session ? 'Online' : 'Signed out'}</p>
              </div>
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {actionMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <RecentItemsList
          items={items}
          loading={loading}
          onEditText={handleEditText}
          onCopyText={handleCopy}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      </div>

      <TextEditorModal
        open={editorOpen}
        item={editingItem}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveText}
        onDelete={async (itemId) => {
          try {
            if (!token) return;
            const current = items.find((entry) => entry.id === itemId);
            if (current && !window.confirm(`Delete "${current.title}"?`)) return;
            await deleteItem(token, itemId);
            refresh();
            setEditorOpen(false);
            showAction('Item deleted.');
          } catch (error) {
            showAction(error instanceof Error ? error.message : 'Delete failed.');
          }
        }}
      />
    </AppShell>
  );
};
