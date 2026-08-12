import type { PropsWithChildren } from 'react';
import { clsx } from 'clsx';

export const Card = ({ className, children }: PropsWithChildren<{ className?: string }>) => (
  <section className={clsx('rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur', className)}>
    {children}
  </section>
);
