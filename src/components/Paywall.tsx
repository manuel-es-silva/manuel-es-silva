import { useState } from 'react';
import { Button } from './Button';
import { setUnlocked } from '../lib/entitlement';
import { isNative } from '../lib/platform';
import { purchaseNativeUnlock, restoreNativePurchases } from '../lib/nativePurchase';
import { STRIPE_PAYMENT_LINK, UNLOCK_FEATURES, UNLOCK_PRICE_LABEL } from '../config/payments';

export function Paywall() {
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const native = isNative();

  async function handlePurchase() {
    if (!native) {
      window.location.href = STRIPE_PAYMENT_LINK;
      return;
    }
    setBusy('purchase');
    try {
      await purchaseNativeUnlock();
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setBusy('restore');
    try {
      await restoreNativePurchases();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white rounded-xl p-4">
      <ul className="space-y-1.5 mb-4 text-sm text-slate-700">
        {UNLOCK_FEATURES.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-brand-600">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Button onClick={handlePurchase} disabled={busy !== null}>
        {busy === 'purchase' ? '…' : `Unlock — ${UNLOCK_PRICE_LABEL}`}
      </Button>

      {native ? (
        <button
          className="w-full text-center text-slate-400 text-xs mt-3"
          onClick={handleRestore}
          disabled={busy !== null}
        >
          {busy === 'restore' ? '…' : 'Restore purchases'}
        </button>
      ) : (
        <button
          className="w-full text-center text-slate-400 text-xs mt-3"
          onClick={() => setUnlocked(true)}
        >
          Already paid? Unlock
        </button>
      )}
    </div>
  );
}
