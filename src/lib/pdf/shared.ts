import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

export const PAGE_WIDTH = 595.28; // A4 pt
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 40;

export const BRAND_COLOR = rgb(0.05, 0.4, 0.36);
export const TEXT_COLOR = rgb(0.1, 0.1, 0.1);
export const MUTED_COLOR = rgb(0.4, 0.4, 0.4);
export const DAMAGE_COLOR = rgb(0.8, 0.15, 0.15);

export async function embedImage(pdfDoc: PDFDocument, blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/png') {
    return pdfDoc.embedPng(bytes);
  }
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return pdfDoc.embedPng(bytes);
  }
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function labelKey(key: string): string {
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function finalizePdf(pdfDoc: PDFDocument): Promise<Blob> {
  const bytes = await pdfDoc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
