import type { PropsWithChildren, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
}

export const Modal = ({ title, open, onClose, footer, children }: PropsWithChildren<ModalProps>) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-glow"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          </div>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[80vh] overflow-auto p-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};
