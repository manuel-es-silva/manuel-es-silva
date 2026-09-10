const KEY = 'deposit-guard:active-property-id';

export function getActivePropertyId(): string | null {
  return localStorage.getItem(KEY);
}

export function setActivePropertyId(id: string): void {
  localStorage.setItem(KEY, id);
}
