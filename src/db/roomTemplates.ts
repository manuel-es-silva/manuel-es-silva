import type { ChecklistItemTemplate, RoomKind } from '../types';

export const DEFAULT_ROOM_KINDS: { kind: RoomKind; name: string }[] = [
  { kind: 'entry', name: 'Entry' },
  { kind: 'living-room', name: 'Living Room' },
  { kind: 'kitchen', name: 'Kitchen' },
  { kind: 'bathroom', name: 'Bathroom' },
  { kind: 'bedroom', name: 'Bedroom' },
  { kind: 'closet', name: 'Closet' },
  { kind: 'hallway', name: 'Hallway' },
  { kind: 'balcony', name: 'Balcony' },
];

const BASE_ITEMS: ChecklistItemTemplate[] = [
  { key: 'wall-1', label: 'Wall 1' },
  { key: 'wall-2', label: 'Wall 2' },
  { key: 'wall-3', label: 'Wall 3' },
  { key: 'wall-4', label: 'Wall 4' },
  { key: 'floor', label: 'Floor' },
  { key: 'ceiling', label: 'Ceiling' },
  { key: 'windows', label: 'Windows' },
  { key: 'doors', label: 'Doors' },
  { key: 'outlets-switches', label: 'Outlets & switches' },
];

const CABINET_ITEMS: ChecklistItemTemplate[] = [
  { key: 'cabinets-inside', label: 'Inside cabinets & drawers' },
];

const KITCHEN_APPLIANCES: ChecklistItemTemplate[] = [
  { key: 'fridge-outside', label: 'Fridge (outside)' },
  { key: 'fridge-inside', label: 'Fridge (inside)' },
  { key: 'oven-outside', label: 'Oven (outside)' },
  { key: 'oven-inside', label: 'Oven (inside)' },
  { key: 'dishwasher', label: 'Dishwasher' },
];

const LAUNDRY_APPLIANCES: ChecklistItemTemplate[] = [
  { key: 'washer', label: 'Washer' },
];

const FIXTURES: ChecklistItemTemplate[] = [{ key: 'fixtures', label: 'Light fixtures' }];

export function checklistForRoomKind(kind: RoomKind): ChecklistItemTemplate[] {
  switch (kind) {
    case 'kitchen':
      return [...BASE_ITEMS, ...CABINET_ITEMS, ...KITCHEN_APPLIANCES, ...FIXTURES];
    case 'bathroom':
      return [...BASE_ITEMS, ...CABINET_ITEMS, ...FIXTURES, { key: 'fan', label: 'Exhaust fan' }];
    case 'bedroom':
    case 'living-room':
    case 'hallway':
    case 'entry':
      return [...BASE_ITEMS, ...FIXTURES];
    case 'closet':
      return [
        { key: 'walls', label: 'Walls' },
        { key: 'floor', label: 'Floor' },
        { key: 'shelving', label: 'Shelving / rod' },
      ];
    case 'balcony':
      return [
        { key: 'floor', label: 'Floor' },
        { key: 'railing', label: 'Railing' },
        { key: 'door', label: 'Sliding door / door' },
      ];
    case 'custom':
    default:
      return BASE_ITEMS;
  }
}

// If the user's unit has a washer in a utility room, they can add extra shots
// from the checklist screen regardless — this list just seeds sane defaults.
export const EXTRA_LAUNDRY_ITEMS = LAUNDRY_APPLIANCES;
