import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseClasses =
  'inline-flex transform-gpu touch-manipulation select-none items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-150 ease-out active:scale-[0.92] active:brightness-95 active:duration-75 active:shadow-[inset_0_2px_6px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none [-webkit-tap-highlight-color:transparent]';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] text-white shadow-[0_16px_30px_rgba(99,102,241,0.24)] hover:brightness-105',
  secondary: 'border border-slate-200 bg-white/90 text-slate-950 shadow-sm hover:bg-white active:bg-slate-100',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200/90 active:text-slate-950',
  danger: 'bg-rose-600 text-white hover:bg-rose-500'
};

export const Button = ({ variant = 'primary', className, children, ...props }: PropsWithChildren<ButtonProps>) => (
  <button className={clsx(baseClasses, variantClasses[variant], className)} type={props.type ?? 'button'} {...props}>
    {children}
  </button>
);
