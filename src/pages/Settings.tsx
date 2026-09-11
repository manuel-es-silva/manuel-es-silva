import { PageShell } from '../components/PageShell';
import { Disclaimer } from '../components/Disclaimer';
import { Paywall } from '../components/Paywall';
import { useEntitlement } from '../lib/entitlement';
import { APP_NAME } from '../config/app';
import { UNLOCK_PRICE_LABEL } from '../config/payments';

export function Settings() {
  const unlocked = useEntitlement();

  return (
    <PageShell title="Settings" onBack>
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 flex items-center justify-between">
          <span className="font-medium text-slate-800">{APP_NAME}</span>
          <span className={`text-sm ${unlocked ? 'text-green-700' : 'text-slate-500'}`}>
            {unlocked ? 'Unlocked' : `Locked — ${UNLOCK_PRICE_LABEL}`}
          </span>
        </div>

        {!unlocked && <Paywall />}

        <Disclaimer />
      </div>
    </PageShell>
  );
}
