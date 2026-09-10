import { db, newId } from './db';
import { checklistForRoomKind, DEFAULT_ROOM_KINDS } from './roomTemplates';
import { sha256 } from '../lib/hash';
import type { Phase, Photo, Property, Roommate, Room } from '../types';

export async function createProperty(input: {
  address: string;
  moveInDate: string;
  landlordName: string;
  landlordEmail: string;
  roommates: Roommate[];
}): Promise<Property> {
  const property: Property = {
    id: newId(),
    address: input.address,
    moveInDate: input.moveInDate,
    landlordName: input.landlordName,
    landlordEmail: input.landlordEmail,
    roommates: input.roommates,
    createdAt: new Date().toISOString(),
  };
  await db.properties.add(property);

  const rooms: Room[] = DEFAULT_ROOM_KINDS.map((r, i) => ({
    id: newId(),
    propertyId: property.id,
    name: r.name,
    kind: r.kind,
    sortOrder: i,
  }));
  await db.rooms.bulkAdd(rooms);

  return property;
}

export async function getProperty(id: string): Promise<Property | undefined> {
  return db.properties.get(id);
}

export async function getMostRecentProperty(): Promise<Property | undefined> {
  return db.properties.orderBy('createdAt').last();
}

export async function listRooms(propertyId: string): Promise<Room[]> {
  return db.rooms.where('propertyId').equals(propertyId).sortBy('sortOrder');
}

export async function addRoom(propertyId: string, name: string): Promise<Room> {
  const existing = await listRooms(propertyId);
  const room: Room = {
    id: newId(),
    propertyId,
    name,
    kind: 'custom',
    sortOrder: existing.length,
  };
  await db.rooms.add(room);
  return room;
}

export async function renameRoom(roomId: string, name: string): Promise<void> {
  await db.rooms.update(roomId, { name });
}

export async function removeRoom(roomId: string): Promise<void> {
  const photos = await db.photos.where('roomId').equals(roomId).toArray();
  await db.photos.bulkDelete(photos.map((p) => p.id));
  await db.rooms.delete(roomId);
}

export function checklistForRoom(room: Room) {
  return checklistForRoomKind(room.kind);
}

export async function photosForRoom(roomId: string, phase: Phase): Promise<Photo[]> {
  return db.photos.where({ roomId, phase }).toArray();
}

export async function photosForProperty(propertyId: string, phase: Phase): Promise<Photo[]> {
  return db.photos.where({ propertyId, phase }).toArray();
}

export async function addPhoto(input: {
  propertyId: string;
  roomId: string;
  phase: Phase;
  checklistKey: string;
  blob: Blob;
  note?: string;
  isDamage: boolean;
  pairedMoveInPhotoId?: string;
}): Promise<Photo> {
  const hash = await sha256(input.blob);
  const photo: Photo = {
    id: newId(),
    propertyId: input.propertyId,
    roomId: input.roomId,
    phase: input.phase,
    checklistKey: input.checklistKey,
    blob: input.blob,
    note: input.note,
    isDamage: input.isDamage,
    capturedAt: new Date().toISOString(),
    sha256: hash,
    pairedMoveInPhotoId: input.pairedMoveInPhotoId,
  };
  await db.photos.add(photo);
  return photo;
}

export async function updatePhoto(
  photoId: string,
  changes: Partial<Pick<Photo, 'note' | 'isDamage'>>,
): Promise<void> {
  await db.photos.update(photoId, changes);
}

export async function deletePhoto(photoId: string): Promise<void> {
  await db.photos.delete(photoId);
}

export async function recordReportShared(propertyId: string, phase: Phase) {
  const existing = await db.reportShares.where({ propertyId, phase }).first();
  if (existing) {
    await db.reportShares.update(existing.id, { sharedAt: new Date().toISOString() });
    return existing.id;
  }
  const id = newId();
  await db.reportShares.add({
    id,
    propertyId,
    phase,
    sharedAt: new Date().toISOString(),
  });
  return id;
}

export async function confirmReportSent(propertyId: string, phase: Phase) {
  const existing = await db.reportShares.where({ propertyId, phase }).first();
  if (existing) {
    await db.reportShares.update(existing.id, { confirmedSentAt: new Date().toISOString() });
  }
}

export async function getReportShare(propertyId: string, phase: Phase) {
  return db.reportShares.where({ propertyId, phase }).first();
}
