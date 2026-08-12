import type { TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={clsx(
      'min-h-40 w-full resize-y rounded-3xl border border-slate-200 bg-white/90 px-4 py-4 text-sm text-slate-950 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-sky-400/40',
      className
    )}
    {...props}
  />
);
