import Dexie, { type EntityTable } from 'dexie';
import type { Photo, Property, ReportShare, Room } from '../types';

export class AppDatabase extends Dexie {
  properties!: EntityTable<Property, 'id'>;
  rooms!: EntityTable<Room, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  reportShares!: EntityTable<ReportShare, 'id'>;

  constructor() {
    super('deposit-guard');
    this.version(1).stores({
      properties: 'id, createdAt',
      rooms: 'id, propertyId, sortOrder',
      photos: 'id, propertyId, roomId, phase, checklistKey, pairedMoveInPhotoId',
      reportShares: 'id, propertyId, phase',
    });
  }
}

export const db = new AppDatabase();

export function newId(): string {
  return crypto.randomUUID();
}
