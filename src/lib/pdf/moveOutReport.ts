import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import { APP_NAME, DISCLAIMER_TEXT } from '../../config/app';
import { shortHash } from '../hash';
import { getPhotoBlob } from '../photoStorage';
import type { Photo, Property, RoomComparison } from '../../types';
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

export async function generateMoveOutReport(
  property: Property,
  roomComparisons: RoomComparison[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const allPairs = roomComparisons.flatMap((r) => r.pairs);
  const bothCount = allPairs.filter((p) => p.moveIn && p.moveOut).length;
  const missingCount = allPairs.length - bothCount;
  const damageCount = allPairs.filter((p) => p.moveIn?.isDamage || p.moveOut?.isDamage).length;

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
  drawTitle('Move-Out Comparison Report', 16, font);
  y -= 10;
  drawLine(`Property address: ${property.address}`);
  drawLine(`Move-in date: ${new Date(property.moveInDate).toLocaleDateString()}`);
  drawLine(
    `Move-out date: ${property.moveOutDate ? new Date(property.moveOutDate).toLocaleDateString() : 'not set'}`,
  );
  drawLine(`Landlord: ${property.landlordName} <${property.landlordEmail}>`);
  if (property.roommates.length > 0) {
    drawLine(`Roommates: ${property.roommates.map((r) => r.name).join(', ')}`);
  }
  drawLine(`Report generated: ${formatDate(new Date().toISOString())}`);
  drawLine(
    `Items compared: ${bothCount} with both photos, ${missingCount} with only one side  |  Flagged as damage: ${damageCount}`,
  );

  y -= 10;
  const disclaimerLines = wrapText(DISCLAIMER_TEXT, font, 9, PAGE_WIDTH - MARGIN * 2);
  for (const line of disclaimerLines) {
    if (y < MARGIN) break;
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: MUTED_COLOR });
    y -= 12;
  }

  // ---- Room comparison pages ----
  const GAP = 16;
  const PHOTO_W = (PAGE_WIDTH - MARGIN * 2 - GAP) / 2;
  const PHOTO_H = PHOTO_W * 0.72;
  const ROW_H = PHOTO_H + 62;

  for (const { room, pairs } of roomComparisons) {
    if (pairs.length === 0) continue;

    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    page.drawText(room.name, { x: MARGIN, y, size: 18, font: bold, color: BRAND_COLOR });
    y -= 28;

    for (const pair of pairs) {
      if (y - ROW_H < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      page.drawText(labelKey(pair.checklistKey), {
        x: MARGIN,
        y,
        size: 11,
        font: bold,
        color: TEXT_COLOR,
      });
      y -= 16;

      await drawSide(pdfDoc, page, pair.moveIn, 'Move-in', MARGIN, y, PHOTO_W, PHOTO_H, font, bold);
      await drawSide(
        pdfDoc,
        page,
        pair.moveOut,
        'Move-out',
        MARGIN + PHOTO_W + GAP,
        y,
        PHOTO_W,
        PHOTO_H,
        font,
        bold,
      );

      y -= ROW_H - 16;
    }
  }

  // ---- Not-compared appendix ----
  const uncompared = allPairs.filter((p) => !p.moveIn || !p.moveOut);
  if (uncompared.length > 0) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    page.drawText('Items With Only One Photo', { x: MARGIN, y, size: 16, font: bold, color: BRAND_COLOR });
    y -= 20;
    page.drawText(
      'These checklist items only have a move-in or only a move-out photo, so no side-by-side comparison could be made.',
      { x: MARGIN, y, size: 9, font, color: MUTED_COLOR },
    );
    y -= 20;
    for (const roomComp of roomComparisons) {
      for (const pair of roomComp.pairs) {
        if (pair.moveIn && pair.moveOut) continue;
        if (y < MARGIN + 20) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
        const missing = pair.moveIn ? 'no move-out photo' : 'no move-in photo';
        page.drawText(
          `${roomComp.room.name} / ${labelKey(pair.checklistKey)} — ${missing}`,
          { x: MARGIN, y, size: 9, font, color: TEXT_COLOR },
        );
        y -= 14;
      }
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

  for (const { room, pairs } of roomComparisons) {
    for (const pair of pairs) {
      for (const [phaseLabel, photo] of [
        ['Move-in', pair.moveIn],
        ['Move-out', pair.moveOut],
      ] as const) {
        if (!photo) continue;
        if (y < MARGIN + 20) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
        const line = `${room.name} / ${labelKey(pair.checklistKey)} (${phaseLabel})  —  ${formatDate(photo.capturedAt)}  —  sha256: ${shortHash(photo.sha256)}`;
        page.drawText(line, { x: MARGIN, y, size: 8, font, color: TEXT_COLOR });
        y -= 12;
      }
    }
  }

  return finalizePdf(pdfDoc);
}

async function drawSide(
  pdfDoc: PDFDocument,
  page: import('pdf-lib').PDFPage,
  photo: Photo | undefined,
  sideLabel: string,
  x: number,
  yTop: number,
  w: number,
  h: number,
  font: PDFFont,
  bold: PDFFont,
) {
  page.drawText(sideLabel, { x, y: yTop, size: 9, font: bold, color: MUTED_COLOR });
  const imgTop = yTop - 12;

  if (!photo) {
    page.drawRectangle({
      x,
      y: imgTop - h,
      width: w,
      height: h,
      borderColor: MUTED_COLOR,
      borderWidth: 1,
    });
    page.drawText(`No ${sideLabel.toLowerCase()} photo`, {
      x: x + 8,
      y: imgTop - h / 2,
      size: 9,
      font,
      color: MUTED_COLOR,
    });
    return;
  }

  const img = await embedImage(pdfDoc, await getPhotoBlob(photo));
  const scale = Math.min(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  const imgX = x + (w - iw) / 2;
  const imgY = imgTop - h + (h - ih) / 2;

  if (photo.isDamage) {
    page.drawRectangle({
      x,
      y: imgTop - h - 2,
      width: w,
      height: h + 4,
      borderColor: DAMAGE_COLOR,
      borderWidth: 2,
    });
  }
  page.drawImage(img, { x: imgX, y: imgY, width: iw, height: ih });

  const captionY = imgTop - h - 12;
  page.drawText(formatDate(photo.capturedAt), { x, y: captionY, size: 8, font, color: MUTED_COLOR });
  let nextY = captionY - 12;
  if (photo.isDamage) {
    page.drawText('DAMAGE NOTED', { x, y: nextY, size: 8, font: bold, color: DAMAGE_COLOR });
    nextY -= 12;
  }
  if (photo.note) {
    const [firstLine] = wrapText(photo.note, font, 8, w);
    if (firstLine) {
      page.drawText(firstLine, { x, y: nextY, size: 8, font, color: TEXT_COLOR });
    }
  }
}
