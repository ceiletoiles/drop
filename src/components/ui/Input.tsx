import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-sky-400/40',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';
