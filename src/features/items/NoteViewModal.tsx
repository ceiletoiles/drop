import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { MoreHorizontalIcon, PencilIcon, RenameIcon, TextIcon, TrashIcon } from '../../components/ui/Icon';
import type { Item } from './types';
import { formatRelativeTime } from '../../lib/format';
import { clsx } from 'clsx';

interface NoteViewModalProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onRenameTitle: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export const NoteViewModal = ({ open, item, onClose, onEdit, onRenameTitle, onDelete }: NoteViewModalProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
    }
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }

    return undefined;
  }, [menuOpen]);

  return (
    <Modal
      open={open}
      title={item?.title ? `View note · ${item.title}` : 'View note'}
      onClose={onClose}
    >
      {item ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-slate-100 text-slate-600">
                <TextIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.98rem] font-semibold tracking-tight text-slate-950">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatRelativeTime(item.createdAt)}</p>
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-11 rounded-2xl p-0 text-slate-500 hover:bg-slate-100"
                onClick={() => setMenuOpen((current) => !current)}
                aria-label="Note options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontalIcon className="h-6 w-6" />
              </Button>

              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(item);
                    }}
                  >
                    <PencilIcon className="h-5 w-5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100"
                    onClick={() => {
                      setMenuOpen(false);
                      onRenameTitle(item);
                    }}
                  >
                    <RenameIcon className="h-5 w-5" />
                    Rename title
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item);
                    }}
                  >
                    <TrashIcon className="h-5 w-5" />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Note body</p>
            <Textarea
              value={item.text?.content ?? ''}
              readOnly
              className={clsx(
                'min-h-[28rem] resize-none border-slate-200 bg-slate-50/90 font-sans text-[15px] leading-7 text-slate-950 shadow-none'
              )}
            />
          </div>

        </div>
      ) : null}
    </Modal>
  );
};
