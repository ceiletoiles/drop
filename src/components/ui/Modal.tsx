import { useRef, useState, type PointerEvent, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Button } from './Button';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
  footerClassName?: string;
  bodyClassName?: string;
}

export const Modal = ({ title, open, onClose, footer, footerClassName, bodyClassName, children }: PropsWithChildren<ModalProps>) => {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStart = useRef<number | null>(null);

  if (!open) return null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    setDragOffset(Math.max(0, event.clientY - dragStart.current));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const shouldClose = dragOffset > 120;
    dragStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragOffset(0);
    if (shouldClose) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/55 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-glow transition-transform duration-200 ease-out sm:max-h-[calc(100dvh-2rem)] sm:rounded-none sm:transition-none"
        style={{ transform: `translateY(${dragOffset}px)` }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div
            className="min-w-0 flex-1 touch-none cursor-grab pt-2 active:cursor-grabbing sm:pt-0"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          </div>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className={clsx('flex-1 overflow-y-auto', bodyClassName ?? 'p-5')}>{children}</div>
        {footer ? <div className={clsx('border-t border-slate-100 px-5 py-4', footerClassName)}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};
