export interface Roommate {
  id: string;
  name: string;
  /** Fraction 0-1 of the deposit this person paid. Used from Phase 3. */
  depositShare?: number;
}

export interface Property {
  id: string;
  address: string;
  moveInDate: string; // ISO date
  moveOutDate?: string; // ISO date, set when move-out mode starts
  landlordName: string;
  landlordEmail: string;
  roommates: Roommate[];
  createdAt: string; // ISO datetime
}

export type RoomKind =
  | 'entry'
  | 'living-room'
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'closet'
  | 'hallway'
  | 'balcony'
  | 'custom';

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  kind: RoomKind;
  sortOrder: number;
}

export type Phase = 'move-in' | 'move-out';

export interface Photo {
  id: string;
  propertyId: string;
  roomId: string;
  phase: Phase;
  /** Key of the checklist item this photo answers, or 'extra' for user-added shots. */
  checklistKey: string;
  blob: Blob;
  note?: string;
  isDamage: boolean;
  capturedAt: string; // ISO datetime
  sha256: string;
  /** For move-out photos: the move-in photo it's meant to be compared against. */
  pairedMoveInPhotoId?: string;
}

export interface ReportShare {
  id: string;
  propertyId: string;
  phase: Phase;
  sharedAt?: string;
  confirmedSentAt?: string;
}

export interface ChecklistItemTemplate {
  key: string;
  label: string;
}

export interface ComparisonPair {
  checklistKey: string;
  moveIn?: Photo;
  moveOut?: Photo;
}

export interface RoomComparison {
  room: Room;
  pairs: ComparisonPair[];
}
