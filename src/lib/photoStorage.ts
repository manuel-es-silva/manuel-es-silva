import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { isNative } from './platform';
import type { Photo } from '../types';

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mimeType });
}

function pathFor(propertyId: string, photoId: string): string {
  return `photos/${propertyId}/${photoId}.jpg`;
}

/**
 * Saves captured photo bytes to whichever storage this platform uses:
 * a Blob kept inline (web, in IndexedDB) or a file in app storage (native,
 * via the Filesystem plugin) — see the Photo type for why only one is set.
 */
export async function savePhotoFile(
  propertyId: string,
  photoId: string,
  blob: Blob,
): Promise<{ blob?: Blob; filePath?: string }> {
  if (!isNative()) {
    return { blob };
  }
  const path = pathFor(propertyId, photoId);
  const data = await blobToBase64(blob);
  await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
  return { filePath: path };
}

export async function deletePhotoFile(photo: Photo): Promise<void> {
  if (!photo.filePath) return;
  await Filesystem.deleteFile({ path: photo.filePath, directory: Directory.Data }).catch(() => {
    // Already gone is fine — nothing left to clean up.
  });
}

/** Full image bytes, e.g. for embedding into a generated PDF. */
export async function getPhotoBlob(photo: Photo): Promise<Blob> {
  if (photo.blob) return photo.blob;
  if (!photo.filePath) throw new Error(`Photo ${photo.id} has neither blob nor filePath`);
  const result = await Filesystem.readFile({ path: photo.filePath, directory: Directory.Data });
  const base64 = typeof result.data === 'string' ? result.data : await blobToBase64(result.data);
  return base64ToBlob(base64, 'image/jpeg');
}

/** A URL this WebView can load directly in <img>, without reading the whole file into JS. */
export async function getPhotoDisplayUrl(photo: Photo): Promise<string> {
  if (photo.blob) return URL.createObjectURL(photo.blob);
  if (!photo.filePath) throw new Error(`Photo ${photo.id} has neither blob nor filePath`);
  const { uri } = await Filesystem.getUri({ path: photo.filePath, directory: Directory.Data });
  return Capacitor.convertFileSrc(uri);
}

/** Displayable <img src> for a photo — undefined while it's still resolving. */
export function usePhotoUrl(photo: Photo): string | undefined {
  const [url, setUrl] = useState<string | undefined>(photo.blob ? URL.createObjectURL(photo.blob) : undefined);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;

    if (photo.blob) {
      objectUrl = URL.createObjectURL(photo.blob);
      setUrl(objectUrl);
    } else {
      setUrl(undefined);
      getPhotoDisplayUrl(photo).then((resolved) => {
        if (!cancelled) setUrl(resolved);
      });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id, photo.blob, photo.filePath]);

  return url;
}
