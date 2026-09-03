import type { SVGProps } from "react";
import { clsx } from "clsx";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const LogoIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-6 w-6", className)} {...baseProps} {...props}>
    <path
      d="M12 2 6.5 9.5a6.5 6.5 0 1 0 13 0L12 2Z"
      fill="currentColor"
      stroke="none"
    />
    <path d="M8.5 12.5 12 9l3.5 3.5M12 9v8" />
  </svg>
);

export const HomeIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="m4 11 8-7 8 7" />
    <path d="M6 10.5V20h12v-9.5" />
  </svg>
);

export const ListIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const GridIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <rect x="4.5" y="4.5" width="6" height="6" rx="1.5" />
    <rect x="13.5" y="4.5" width="6" height="6" rx="1.5" />
    <rect x="4.5" y="13.5" width="6" height="6" rx="1.5" />
    <rect x="13.5" y="13.5" width="6" height="6" rx="1.5" />
  </svg>
);

export const TextIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M13.054 18.946a11 11 0 0 1-2.11 0" />
    <path d="M13.054 5.054a11 11 0 0 0-2.11-.001" />
    <path d="M17.072 6.274a11 11 0 0 1 1.753 1.173" />
    <path d="M18.825 16.552a11 11 0 0 1-1.753 1.174" />
    <path d="M2.514 13.303a11 11 0 0 1-.452-.954 1 1 0 0 1 0-.697 11 11 0 0 1 .45-.955" />
    <path d="M21.485 10.697a11 11 0 0 1 .453.955 1 1 0 0 1 0 .697 11 11 0 0 1-.453.954" />
    <path d="M5.173 7.448a11 11 0 0 1 1.753-1.174" />
    <path d="M6.926 17.726a11 11 0 0 1-1.753-1.174" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SquareTextIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 8h8" />
    <path d="M7 12h10" />
    <path d="M7 16h6" />
  </svg>
);

export const RenameIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M2 11.5V5a2 2 0 0 1 2-2h3.9c.7 0 1.3.3 1.7.9l.8 1.2c.4.6 1 .9 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5" />
    <path d="M11.378 13.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
  </svg>
);

export const FileIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M6 3.5h7l5 5V20.5H6z" />
    <path d="M13 3.5V8.5h5" />
  </svg>
);

export const ClockIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v5l3 2" />
  </svg>
);

export const ExpirationIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M12 2a10 10 0 0 1 7.38 16.75" />
    <path d="M12 6v6l4 2" />
    <path d="M2.5 8.875a10 10 0 0 0-.5 3" />
    <path d="M2.83 16a10 10 0 0 0 2.43 3.4" />
    <path d="M4.636 5.235a10 10 0 0 1 .891-.857" />
    <path d="M8.644 21.42a10 10 0 0 0 7.631-.38" />
  </svg>
);

export const CalendarIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
    <path d="M7.5 3.5V7" />
    <path d="M16.5 3.5V7" />
    <path d="M4 9h16" />
  </svg>
);

export const LockIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
  </svg>
);

export const ImageIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="m6.5 16 4.2-4.2a1.5 1.5 0 0 1 2.1 0L17 16" />
    <path d="m13 13 2.1-2.1a1.5 1.5 0 0 1 2.1 0L18 12.8" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const SearchIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const SortIcon = ({ className, ...props }: IconProps) => (
  <svg
    className={clsx("h-5 w-5", className)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 5C7.55228 5 8 5.44772 8 6V15.5858L10.2929 13.2929C10.6834 12.9024 11.3166 12.9024 11.7071 13.2929C12.0976 13.6834 12.0976 14.3166 11.7071 14.7071L7.70711 18.7071C7.31658 19.0976 6.68342 19.0976 6.29289 18.7071L2.29289 14.7071C1.90237 14.3166 1.90237 13.6834 2.29289 13.2929C2.68342 12.9024 3.31658 12.9024 3.70711 13.2929L6 15.5858V6C6 5.44772 6.44772 5 7 5ZM16.2929 5.29289C16.6834 4.90237 17.3166 4.90237 17.7071 5.29289L21.7071 9.29289C22.0976 9.68342 22.0976 10.3166 21.7071 10.7071C21.3166 11.0976 20.6834 11.0976 20.2929 10.7071L18 8.41421V18C18 18.5523 17.5523 19 17 19C16.4477 19 16 18.5523 16 18V8.41421L13.7071 10.7071C13.3166 11.0976 12.6834 11.0976 12.2929 10.7071C11.9024 10.3166 11.9024 9.68342 12.2929 9.29289L16.2929 5.29289Z"
      fill="currentColor"
    />
  </svg>
);

export const TrashIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const UploadIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-6 w-6", className)} {...baseProps} {...props}>
    <path d="M12 16V5" />
    <path d="m7.5 9 4.5-4.5L16.5 9" />
    <path d="M6 19h12" />
  </svg>
);

export const CloudUploadIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-6 w-6", className)} {...baseProps} {...props}>
    <path d="M8 18a4 4 0 1 1 .2-8A5.5 5.5 0 0 1 18 11.5a3.5 3.5 0 0 1-.5 6.9H8Z" />
    <path d="M12 15V7" />
    <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
  </svg>
);

export const PlusIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-4 w-4", className)} {...baseProps} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MenuIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const ChevronDownIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-4 w-4", className)} {...baseProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const CopyIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M8 4V16C8 17.1046 8.89543 18 10 18L18 18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.0829 2.56999C15.7092 2.2046 15.2074 2 14.6847 2H10C8.89543 2 8 2.89543 8 4Z" />
    <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" />
  </svg>
);

export const ShareIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </svg>
);

export const DownloadIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M12 17V3" />
    <path d="m6 11 6 6 6-6" />
    <path d="M19 21H5" />
  </svg>
);

export const MoreHorizontalIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

export const LogOutIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M10 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
    <path d="m15 8 4 4-4 4" />
    <path d="M19 12H9" />
  </svg>
);

export const UserIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M20 21a8 8 0 1 0-16 0" />
    <circle cx="12" cy="8" r="3.5" />
  </svg>
);

export const UserPlusIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-4 w-4", className)} {...baseProps} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="10" cy="7" r="4" />
    <path d="M20 8v6" />
    <path d="M17 11h6" />
  </svg>
);

export const BackIcon = ({ className, ...props }: IconProps) => (
  <svg
    {...baseProps}
    viewBox="0 0 24 24"
    className={clsx("h-12 w-12 text-black", className)}
    stroke="currentColor"
    strokeWidth={2.2}
    fill="none"
    {...props}
  >
    <circle cx="12" cy="12" r="8.5" />
    <path d="M13.5 7.5 8.5 12l5 4.5" />
    <path d="M8.5 12h8" />
  </svg>
);

export const ArrowBackIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-8 w-8", className)} {...baseProps} viewBox="0 0 52 52" fill="currentColor" stroke="none" {...props}>
    <path d="M50 24H6.83L27.41 3.41a2 2 0 0 0 0-2.82 2 2 0 0 0-2.82 0l-24 24a1.79 1.79 0 0 0-.25.31A1.19 1.19 0 0 0 .25 25c0 .07-.07.13-.1.2l-.06.2a.84.84 0 0 0 0 .17 2 2 0 0 0 0 .78.84.84 0 0 0 0 .17l.06.2c0 .07.07.13.1.2a1.19 1.19 0 0 0 .09.15 1.79 1.79 0 0 0 .25.31l24 24a2 2 0 1 0 2.82-2.82L6.83 28H50a2 2 0 0 0 0-4Z" />
  </svg>
);

export const UsersIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-4 w-4", className)} {...baseProps} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="10" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const PencilIcon = ({ className, ...props }: IconProps) => (
  <svg className={clsx("h-5 w-5", className)} {...baseProps} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);
