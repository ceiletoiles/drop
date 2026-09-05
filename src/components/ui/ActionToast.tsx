import { useRef, useState, type PointerEvent } from 'react';

interface ActionToastProps {
  message: string;
  onDismiss: () => void;
}

export const ActionToast = ({ message, onDismiss }: ActionToastProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const pointerStart = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;
    setOffsetX(event.clientX - pointerStart.current);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;
    const shouldDismiss = Math.abs(offsetX) > 80;
    pointerStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setOffsetX(0);
    if (shouldDismiss) onDismiss();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3 sm:top-5">
      <div
        className="pointer-events-auto max-w-lg touch-pan-y cursor-grab rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition-transform duration-150 active:cursor-grabbing"
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
};