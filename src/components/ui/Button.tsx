import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-slate-950 text-white shadow-glow hover:bg-slate-800',
  secondary: 'bg-white/90 text-slate-950 ring-1 ring-slate-200 hover:bg-white',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-500'
};

export const Button = ({ variant = 'primary', className, children, ...props }: PropsWithChildren<ButtonProps>) => (
  <button className={clsx(baseClasses, variantClasses[variant], className)} type={props.type ?? 'button'} {...props}>
    {children}
  </button>
);
