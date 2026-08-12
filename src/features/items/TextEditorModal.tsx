import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import type { Item } from './types';
import { Spinner } from '../../components/ui/Spinner';

interface TextEditorModalProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (payload: { title: string; content: string; id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const TextEditorModal = ({ open, item, onClose, onSave, onDelete }: TextEditorModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? '');
      setContent(item?.text?.content ?? '');
      setError(null);
    }
  }, [item, open]);

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave({ id: item?.id, title, content });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={item ? 'Edit text item' : 'New text item'}
      open={open}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">{item ? 'Editing an existing note.' : 'Create and save a note quickly.'}</div>
          <div className="flex items-center gap-3">
            {item && onDelete ? (
              <Button type="button" variant="danger" onClick={() => void onDelete(item.id)} disabled={loading}>
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={loading}>
              {loading ? <Spinner /> : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled note" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Content</span>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste text here..."
            autoFocus
          />
        </label>
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </div>
    </Modal>
  );
};
