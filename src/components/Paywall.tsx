import { Button } from './Button';
import { setUnlocked } from '../lib/entitlement';
import { STRIPE_PAYMENT_LINK, UNLOCK_FEATURES, UNLOCK_PRICE_LABEL } from '../config/payments';

export function Paywall() {
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

      <Button
        onClick={() => {
          window.location.href = STRIPE_PAYMENT_LINK;
        }}
      >
        Unlock — {UNLOCK_PRICE_LABEL}
      </Button>

      <button
        className="w-full text-center text-slate-400 text-xs mt-3"
        onClick={() => setUnlocked(true)}
      >
        Already paid? Unlock
      </button>
    </div>
  );
}
