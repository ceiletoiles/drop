import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { sanitizeFilename } from '../../shared/utils';

interface AndroidDownloadPlugin {
  saveBase64(options: {
    base64: string;
    fileName: string;
    mimeType: string;
    kind: 'image' | 'file';
  }): Promise<{ uri: string }>;
}

const AndroidDownload = registerPlugin<AndroidDownloadPlugin>('AndroidDownload');

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Download failed.'));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Download failed.'));
        return;
      }

      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };

    reader.readAsDataURL(blob);
  });

const triggerWebDownload = (blob: Blob, filename: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
};

export const downloadBlob = async (blob: Blob, filename: string) => {
  const safeFilename = sanitizeFilename(filename);
  const mimeType = blob.type.trim() || 'application/octet-stream';
  const kind = mimeType.startsWith('image/') ? 'image' : 'file';

  if (!Capacitor.isNativePlatform()) {
    triggerWebDownload(blob, safeFilename);
    return { savedOnDevice: false as const, filename: safeFilename };
  }

  if (Capacitor.getPlatform() === 'android') {
    const data = await blobToBase64(blob);
    const result = await AndroidDownload.saveBase64({
      base64: data,
      fileName: safeFilename,
      mimeType,
      kind
    });

    return { savedOnDevice: true as const, filename: safeFilename, uri: result.uri };
  }

  const data = await blobToBase64(blob);
  const directory = Directory.Documents;
  const folder = 'Drop';

  await Filesystem.mkdir({
    path: folder,
    directory,
    recursive: true
  }).catch(() => undefined);

  const result = await Filesystem.writeFile({
    path: `${folder}/${safeFilename}`,
    directory,
    data
  });

  return { savedOnDevice: true as const, filename: safeFilename, uri: result.uri };
};
