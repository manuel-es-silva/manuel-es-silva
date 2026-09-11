import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { APP_NAME, DISCLAIMER_TEXT } from '../../config/app';
import { shortHash } from '../hash';
import type { Photo, Property, Room } from '../../types';
import {
  BRAND_COLOR,
  DAMAGE_COLOR,
  MARGIN,
  MUTED_COLOR,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TEXT_COLOR,
  embedImage,
  finalizePdf,
  formatDate,
  labelKey,
  wrapText,
} from './shared';

interface RoomWithPhotos {
  room: Room;
  photos: Photo[];
}

export async function generateMoveInReport(
  property: Property,
  roomsWithPhotos: RoomWithPhotos[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ---- Cover page ----
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawTitle = (text: string, size: number, f: PDFFont = bold) => {
    page.drawText(text, { x: MARGIN, y, size, font: f, color: BRAND_COLOR });
    y -= size + 10;
  };
  const drawLine = (text: string, size = 11, f: PDFFont = font) => {
    page.drawText(text, { x: MARGIN, y, size, font: f, color: TEXT_COLOR });
    y -= size + 8;
  };

  drawTitle(APP_NAME, 22);
  drawTitle('Move-In Documentation Report', 16, font);
  y -= 10;
  drawLine(`Property address: ${property.address}`);
  drawLine(`Move-in date: ${new Date(property.moveInDate).toLocaleDateString()}`);
  drawLine(`Landlord: ${property.landlordName} <${property.landlordEmail}>`);
  if (property.roommates.length > 0) {
    drawLine(`Roommates: ${property.roommates.map((r) => r.name).join(', ')}`);
  }
  drawLine(`Report generated: ${formatDate(new Date().toISOString())}`);
  const totalPhotos = roomsWithPhotos.reduce((sum, r) => sum + r.photos.length, 0);
  const damageCount = roomsWithPhotos.reduce(
    (sum, r) => sum + r.photos.filter((p) => p.isDamage).length,
    0,
  );
  drawLine(`Rooms documented: ${roomsWithPhotos.length}  |  Photos: ${totalPhotos}  |  Flagged as existing damage: ${damageCount}`);

  y -= 10;
  const disclaimerLines = wrapText(DISCLAIMER_TEXT, font, 9, PAGE_WIDTH - MARGIN * 2);
  for (const line of disclaimerLines) {
    if (y < MARGIN) break;
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: MUTED_COLOR });
    y -= 12;
  }

  // ---- Room pages ----
  const PHOTO_W = (PAGE_WIDTH - MARGIN * 2 - 20) / 2;
  const PHOTO_H = PHOTO_W * 0.75;
  const CARD_H = PHOTO_H + 55;

  for (const { room, photos } of roomsWithPhotos) {
    if (photos.length === 0) continue;

    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    page.drawText(room.name, { x: MARGIN, y, size: 18, font: bold, color: BRAND_COLOR });
    y -= 28;

    let col = 0;
    for (const photo of photos) {
      if (y - CARD_H < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        col = 0;
      }
      const x = MARGIN + col * (PHOTO_W + 20);

      const img = await embedImage(pdfDoc, photo.blob);
      const scale = Math.min(PHOTO_W / img.width, PHOTO_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const imgX = x + (PHOTO_W - w) / 2;
      const imgY = y - PHOTO_H + (PHOTO_H - h) / 2;

      if (photo.isDamage) {
        page.drawRectangle({
          x,
          y: y - PHOTO_H - 2,
          width: PHOTO_W,
          height: PHOTO_H + 4,
          borderColor: DAMAGE_COLOR,
          borderWidth: 2,
        });
      }
      drawPageImage(page, img, imgX, imgY, w, h);

      const labelY = y - PHOTO_H - 14;
      page.drawText(labelKey(photo.checklistKey), {
        x,
        y: labelY,
        size: 9,
        font: bold,
        color: TEXT_COLOR,
      });
      page.drawText(formatDate(photo.capturedAt), {
        x,
        y: labelY - 12,
        size: 8,
        font,
        color: MUTED_COLOR,
      });
      if (photo.isDamage) {
        page.drawText('DAMAGE NOTED', {
          x,
          y: labelY - 24,
          size: 8,
          font: bold,
          color: DAMAGE_COLOR,
        });
      }
      if (photo.note) {
        const noteLines = wrapText(photo.note, font, 8, PHOTO_W);
        page.drawText(noteLines[0] ?? '', {
          x,
          y: labelY - (photo.isDamage ? 36 : 24),
          size: 8,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      col = col === 0 ? 1 : 0;
      if (col === 0) y -= CARD_H;
    }
  }

  // ---- Integrity / hash appendix ----
  page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - MARGIN;
  page.drawText('Photo Integrity Record', { x: MARGIN, y, size: 16, font: bold, color: BRAND_COLOR });
  y -= 20;
  page.drawText(
    'Each photo below is listed with the SHA-256 hash of its image file, computed at capture time. ' +
      'If a photo file is later modified, its hash will no longer match this record.',
    { x: MARGIN, y, size: 9, font, color: MUTED_COLOR },
  );
  y -= 24;

  for (const { room, photos } of roomsWithPhotos) {
    for (const photo of photos) {
      if (y < MARGIN + 20) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      const line = `${room.name} / ${labelKey(photo.checklistKey)}  —  ${formatDate(photo.capturedAt)}  —  sha256: ${shortHash(photo.sha256)}`;
      page.drawText(line, { x: MARGIN, y, size: 8, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 12;
    }
  }

  return finalizePdf(pdfDoc);
}

function drawPageImage(
  page: PDFPage,
  img: Awaited<ReturnType<PDFDocument['embedJpg']>>,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  page.drawImage(img, { x, y, width, height });
}
