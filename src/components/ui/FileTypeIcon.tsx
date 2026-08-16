import type { SVGProps } from 'react';
import { FileIcon as ReactSymbolsFileIcon } from '@react-symbols/icons/utils';
import { Notebook } from '@react-symbols/icons/files';
import { clsx } from 'clsx';
import { getFileTypeKind, type ResolveFileTypeInput } from '../../lib/file';

type IconProps = SVGProps<SVGSVGElement>;

export interface FileTypeIconProps extends Omit<IconProps, 'children'>, ResolveFileTypeInput {}

export const FileTypeIcon = ({ filename, extension, mimeType, itemType, className, ...props }: FileTypeIconProps) => {
  const kind = getFileTypeKind({ filename, extension, mimeType, itemType });

  if (kind === 'note') {
    return <Notebook className={clsx('h-5 w-5', className)} {...props} />;
  }

  const fileName = filename ?? (extension ? `file.${extension}` : 'file');

  return (
    <ReactSymbolsFileIcon
      fileName={fileName}
      autoAssign
      className={clsx('h-5 w-5', className)}
      {...props}
    />
  );
};

