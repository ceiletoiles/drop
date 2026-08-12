export { sanitizeFilename } from '../../shared/utils';

export const inferExtension = (mimeType: string) => {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('zip')) return 'zip';
  if (mimeType.includes('plain')) return 'txt';
  return '';
};
