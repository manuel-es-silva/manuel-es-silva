import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { blobToBase64 } from './photoStorage';
import { isNative } from './platform';

export async function sharePdf(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  if (isNative()) {
    const path = `reports/${filename}`;
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title, url: uri });
      return 'shared';
    } catch {
      return 'shared'; // user likely cancelled the native share sheet — nothing more to do
    }
  }

  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      // AbortError means the user cancelled the share sheet — not a failure.
      if (err instanceof Error && err.name === 'AbortError') {
        return 'downloaded'; // caller can decide whether to still offer download
      }
      // Fall through to download on any other failure.
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
