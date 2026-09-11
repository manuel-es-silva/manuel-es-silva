export interface Roommate {
  id: string;
  name: string;
  /** Dollar amount this person paid toward the deposit. */
  depositPaid?: number;
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
  /** Two-letter USPS state code, for the deposit-return deadline lookup. */
  state?: string;
  depositAmount?: number;
  depositReturnedAmount?: number;
  depositReturnedDate?: string; // ISO date
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
  /** Web: the image data itself, stored inline in IndexedDB. */
  blob?: Blob;
  /** Native: path into device app storage (see lib/photoStorage.ts) — the
   * image data lives in the filesystem, not in this record. Exactly one of
   * blob/filePath is set, decided at capture time by the current platform. */
  filePath?: string;
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

export interface StateRule {
  stateCode: string;
  stateName: string;
  verified: boolean;
  deadlineDays: number | null;
  itemizedListRequired: boolean | null;
  sourceUrl: string | null;
  lastVerified: string | null; // ISO date
  note?: string;
}
