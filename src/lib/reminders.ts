import { LocalNotifications } from '@capacitor/local-notifications';

const KEY_PREFIX = 'deposit-guard:last-notified:';

function notificationId(propertyId: string, offset: number): number {
  let hash = 0;
  for (const ch of propertyId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % 1_000_000) * 10 + offset;
}

/** Requests permission and schedules real OS-level reminders (fire even if the app is closed). */
export async function scheduleNativeDeadlineReminders(
  propertyId: string,
  deadlineDate: Date,
  label: string,
): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  const granted =
    current.display === 'granted' ||
    (await LocalNotifications.requestPermissions()).display === 'granted';
  if (!granted) return false;

  const ids = [0, 1, 2].map((i) => notificationId(propertyId, i));
  await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) }).catch(() => {});

  const threeDaysBefore = new Date(deadlineDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  const dayAfter = new Date(deadlineDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const specs = [
    { id: ids[0], at: threeDaysBefore, body: `3 days left for ${label}` },
    { id: ids[1], at: deadlineDate, body: `${label} is due today` },
    { id: ids[2], at: dayAfter, body: `${label} was due yesterday` },
  ].filter((s) => s.at.getTime() > Date.now());

  if (specs.length > 0) {
    await LocalNotifications.schedule({
      notifications: specs.map((s) => ({
        id: s.id,
        title: 'Deposit deadline',
        body: s.body,
        schedule: { at: s.at },
      })),
    });
  }
  return true;
}

/** Fires an in-browser Notification at most once per day when close to or past a deadline. */
export function maybeNotifyDeadline(propertyId: string, daysLeft: number, label: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (daysLeft > 3) return;

  const today = new Date().toISOString().slice(0, 10);
  const key = `${KEY_PREFIX}${propertyId}`;
  if (localStorage.getItem(key) === today) return;

  const body =
    daysLeft > 0
      ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left for ${label}`
      : daysLeft === 0
        ? `${label} is due today`
        : `${label} is ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;

  new Notification('Deposit deadline', { body });
  localStorage.setItem(key, today);
}
