import { useSyncExternalStore } from 'react';

const KEY = 'deposit-guard:unlocked';
const EVENT = 'deposit-guard:entitlement-change';

/**
 * Single choke point for "has this person paid for the unlock." Web sets
 * this from a Stripe redirect; the Phase 5 iOS/Android builds should call
 * setUnlocked() from their StoreKit/Play Billing purchase callback instead
 * and nothing else in the app needs to change.
 */
export function isUnlocked(): boolean {
  return localStorage.getItem(KEY) === '1';
}

export function setUnlocked(value: boolean): void {
  if (value) {
    localStorage.setItem(KEY, '1');
  } else {
    localStorage.removeItem(KEY);
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

/** Reactive read of isUnlocked() — re-renders when setUnlocked() is called anywhere. */
export function useEntitlement(): boolean {
  return useSyncExternalStore(subscribe, isUnlocked);
}
