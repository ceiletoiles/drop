import type { SVGProps } from 'react';
import { clsx } from 'clsx';

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

export const LogoIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-6 w-6', className)} {...baseProps} {...props}>
    <path d="M12 2 6.5 9.5a6.5 6.5 0 1 0 13 0L12 2Z" fill="currentColor" stroke="none" />
    <path d="M8.5 12.5 12 9l3.5 3.5M12 9v8" />
  </svg>
);

export const HomeIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="m4 11 8-7 8 7" />
    <path d="M6 10.5V20h12v-9.5" />
  </svg>
);

export const ListIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M8 6h10" />
    <path d="M8 12h10" />
    <path d="M8 18h10" />
    <path d="M5 6h.01M5 12h.01M5 18h.01" />
  </svg>
);

export const TextIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M6 4h8l4 4v12H6z" />
    <path d="M14 4v4h4" />
    <path d="M9 11h6M9 15h6" />
  </svg>
);

export const FileIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M6 3.5h7l5 5V20.5H6z" />
    <path d="M13 3.5V8.5h5" />
  </svg>
);

export const ImageIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="m6.5 16 4.2-4.2a1.5 1.5 0 0 1 2.1 0L17 16" />
    <path d="m13 13 2.1-2.1a1.5 1.5 0 0 1 2.1 0L18 12.8" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const SearchIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const TrashIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M7 7l1 13h8l1-13" />
    <path d="M10 11v5M14 11v5" />
  </svg>
);

export const UploadIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-6 w-6', className)} {...baseProps} {...props}>
    <path d="M12 16V5" />
    <path d="m7.5 9 4.5-4.5L16.5 9" />
    <path d="M6 19h12" />
  </svg>
);

export const CloudUploadIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-6 w-6', className)} {...baseProps} {...props}>
    <path d="M8 18a4 4 0 1 1 .2-8A5.5 5.5 0 0 1 18 11.5a3.5 3.5 0 0 1-.5 6.9H8Z" />
    <path d="M12 15V7" />
    <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
  </svg>
);

export const PlusIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-4 w-4', className)} {...baseProps} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MenuIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const ChevronDownIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-4 w-4', className)} {...baseProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const CopyIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <rect x="9" y="9" width="10" height="10" rx="2" />
    <rect x="5" y="5" width="10" height="10" rx="2" />
  </svg>
);

export const DownloadIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M12 4v10" />
    <path d="m8 10 4 4 4-4" />
    <path d="M5 18h14" />
  </svg>
);

export const MoreHorizontalIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} fill="currentColor" stroke="none" {...props}>
    <path d="M5 10C6.10457 10 7 10.8954 7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10Z" />
    <path d="M12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" />
    <path d="M21 12C21 10.8954 20.1046 10 19 10C17.8954 10 17 10.8954 17 12C17 13.1046 17.8954 14 19 14C20.1046 14 21 13.1046 21 12Z" />
  </svg>
);

export const LogOutIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx('h-5 w-5', className)} {...baseProps} {...props}>
    <path d="M10 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
    <path d="m15 8 4 4-4 4" />
    <path d="M19 12H9" />
  </svg>
);
