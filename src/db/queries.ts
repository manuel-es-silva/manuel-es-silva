import { db, newId } from './db';
import { checklistForRoomKind, DEFAULT_ROOM_KINDS } from './roomTemplates';
import { sha256 } from '../lib/hash';
import type { Phase, Photo, Property, Roommate, Room, RoomComparison } from '../types';

export async function createProperty(input: {
  address: string;
  moveInDate: string;
  landlordName: string;
  landlordEmail: string;
  roommates: Roommate[];
  state?: string;
}): Promise<Property> {
  const property: Property = {
    id: newId(),
    address: input.address,
    moveInDate: input.moveInDate,
    landlordName: input.landlordName,
    landlordEmail: input.landlordEmail,
    roommates: input.roommates,
    state: input.state,
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

export async function updateProperty(
  propertyId: string,
  changes: Partial<
    Pick<Property, 'state' | 'depositAmount' | 'depositReturnedAmount' | 'depositReturnedDate'>
  >,
): Promise<void> {
  await db.properties.update(propertyId, changes);
}

export async function setRoommates(propertyId: string, roommates: Roommate[]): Promise<void> {
  await db.properties.update(propertyId, { roommates });
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

function latestPhotoByKey(photos: Photo[]): Map<string, Photo> {
  const map = new Map<string, Photo>();
  for (const photo of photos) {
    const existing = map.get(photo.checklistKey);
    if (!existing || photo.capturedAt > existing.capturedAt) {
      map.set(photo.checklistKey, photo);
    }
  }
  return map;
}

/**
 * Builds move-in/move-out photo pairs per room for the comparison report.
 * When an item was retaken, only the most recent photo per side is paired —
 * every capture still appears in the report's hash appendix via the raw
 * photo tables, this just picks one representative per side for the visual
 * side-by-side.
 */
export async function buildRoomComparisons(propertyId: string): Promise<RoomComparison[]> {
  const rooms = await listRooms(propertyId);
  return Promise.all(
    rooms.map(async (room) => {
      const items = checklistForRoom(room);
      const [moveInPhotos, moveOutPhotos] = await Promise.all([
        photosForRoom(room.id, 'move-in'),
        photosForRoom(room.id, 'move-out'),
      ]);
      const moveInByKey = latestPhotoByKey(moveInPhotos);
      const moveOutByKey = latestPhotoByKey(moveOutPhotos);

      const orderedKeys = [
        ...items.map((i) => i.key),
        ...[...moveInByKey.keys(), ...moveOutByKey.keys()].filter(
          (key) => !items.some((i) => i.key === key),
        ),
      ];
      const seen = new Set<string>();
      const pairs = orderedKeys
        .filter((key) => {
          if (seen.has(key)) return false;
          seen.add(key);
          return moveInByKey.has(key) || moveOutByKey.has(key);
        })
        .map((key) => ({
          checklistKey: key,
          moveIn: moveInByKey.get(key),
          moveOut: moveOutByKey.get(key),
        }));

      return { room, pairs };
    }),
  );
}
