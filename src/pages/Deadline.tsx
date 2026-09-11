import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { Paywall } from '../components/Paywall';
import { db } from '../db/db';
import { updateProperty } from '../db/queries';
import { getActivePropertyId } from '../lib/activeProperty';
import { useEntitlement } from '../lib/entitlement';
import { isNative } from '../lib/platform';
import { getStateRule, STATE_RULES } from '../data/stateRules';
import { maybeNotifyDeadline, scheduleNativeDeadlineReminders } from '../lib/reminders';

export function Deadline() {
  const navigate = useNavigate();
  const propertyId = getActivePropertyId();
  const property = useLiveQuery(() => (propertyId ? db.properties.get(propertyId) : undefined), [propertyId]);
  const unlocked = useEntitlement();
  const [remindersOn, setRemindersOn] = useState(false);
  const notifSupported = isNative() || typeof Notification !== 'undefined';

  const rule = property ? getStateRule(property.state) : undefined;

  const deadlineDate =
    property?.moveOutDate && rule?.deadlineDays != null
      ? addDays(new Date(property.moveOutDate), rule.deadlineDays)
      : undefined;
  const daysLeft = deadlineDate ? daysBetween(new Date(), deadlineDate) : undefined;
  const label = property?.address ? `the deposit deadline for ${property.address}` : undefined;

  useEffect(() => {
    if (isNative()) {
      LocalNotifications.checkPermissions().then((p) => setRemindersOn(p.display === 'granted'));
    } else if (typeof Notification !== 'undefined') {
      setRemindersOn(Notification.permission === 'granted');
    }
  }, []);

  // Web: best-effort check on open, since there's no real scheduled notification.
  useEffect(() => {
    if (!isNative() && unlocked && propertyId && daysLeft !== undefined && label) {
      maybeNotifyDeadline(propertyId, daysLeft, label);
    }
  }, [unlocked, propertyId, daysLeft, label]);

  // Native: (re)schedule real OS notifications whenever the deadline is known and reminders are on.
  useEffect(() => {
    if (isNative() && remindersOn && propertyId && deadlineDate && label) {
      scheduleNativeDeadlineReminders(propertyId, deadlineDate, label);
    }
  }, [remindersOn, propertyId, deadlineDate, label]);

  if (!propertyId) {
    navigate('/');
    return null;
  }

  async function handleStateChange(code: string) {
    await updateProperty(propertyId!, { state: code || undefined });
  }

  async function enableReminders() {
    if (isNative()) {
      const perm = await LocalNotifications.requestPermissions();
      setRemindersOn(perm.display === 'granted');
      return;
    }
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setRemindersOn(perm === 'granted');
  }

  if (!unlocked) {
    return (
      <PageShell title="Deposit deadline" onBack>
        <Paywall />
      </PageShell>
    );
  }

  return (
    <PageShell title="Deposit deadline" onBack>
      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">State</span>
          <select
            className="input"
            value={property?.state ?? ''}
            onChange={(e) => handleStateChange(e.target.value)}
          >
            <option value="">Select…</option>
            {STATE_RULES.map((s) => (
              <option key={s.stateCode} value={s.stateCode}>
                {s.stateName}
              </option>
            ))}
          </select>
        </label>

        {rule && rule.verified ? (
          <div className="bg-white rounded-xl p-4">
            <div className={`text-2xl font-semibold mb-1 ${countdownColor(daysLeft)}`}>
              {deadlineDate
                ? formatCountdown(daysLeft!)
                : `${rule.deadlineDays} day${rule.deadlineDays === 1 ? '' : 's'}`}
            </div>
            {!deadlineDate && (
              <p className="text-sm text-slate-500">Starts once you begin move-out.</p>
            )}
            {deadlineDate && (
              <p className="text-sm text-slate-500">
                Due {deadlineDate.toLocaleDateString()} — {rule.stateName}
              </p>
            )}
            {rule.itemizedListRequired && (
              <p className="text-xs text-slate-400 mt-1">Itemized deduction list required.</p>
            )}
            {rule.note && <p className="text-xs text-slate-400">{rule.note}</p>}
            {rule.sourceUrl && (
              <a
                href={rule.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-700 underline block mt-2"
              >
                Source statute
              </a>
            )}
          </div>
        ) : rule ? (
          <div className="bg-white rounded-xl p-4 text-sm text-slate-600">
            {rule.stateName} isn't verified yet — check your state's rules directly.
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 text-sm text-slate-600">
            Pick your state to see its deadline.
          </div>
        )}

        {notifSupported && !remindersOn && (
          <Button variant="secondary" onClick={enableReminders}>
            Enable reminders
          </Button>
        )}
        {remindersOn && (
          <p className="text-xs text-slate-400">
            Reminders on{!isNative() && ' (while the app is open)'}.
          </p>
        )}
      </div>
    </PageShell>
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  const ms = new Date(to.toDateString()).getTime() - new Date(from.toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

function countdownColor(daysLeft: number | undefined): string {
  if (daysLeft === undefined) return 'text-slate-800';
  if (daysLeft < 0) return 'text-red-600';
  if (daysLeft <= 3) return 'text-amber-600';
  return 'text-green-700';
}

function formatCountdown(daysLeft: number): string {
  if (daysLeft > 0) return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  if (daysLeft === 0) return 'Due today';
  return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
}
