const KEY_PREFIX = 'deposit-guard:last-notified:';

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
