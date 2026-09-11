import type { Phase, Property } from '../types';

export function parsePhase(value: string | undefined): Phase {
  return value === 'move-out' ? 'move-out' : 'move-in';
}

/** Which phase the walkthrough is currently on for this property. */
export function currentPhase(property: Pick<Property, 'moveOutDate'>): Phase {
  return property.moveOutDate ? 'move-out' : 'move-in';
}
