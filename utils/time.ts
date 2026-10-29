// "Synced just now" / "Synced 5 min ago" / "Synced 2 h ago" / "Synced Oct 14, 3:05 PM"
export function formatSyncedAgo(syncedAt: number | null, now: number): string {
  if (syncedAt === null) return 'Not synced yet';

  const seconds = Math.max(0, Math.floor((now - syncedAt) / 1000));
  if (seconds < 60) return 'Synced just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Synced ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours} h ago`;

  const date = new Date(syncedAt);
  return `Synced ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st, 22nd, 23rd ... 31st
const ordinal = (day: number): string => {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
  return `${day}${suffix}`;
};

// Hub timestamp "2026-10-29 19:28:29" -> "Oct 29th, 7:28 PM".
// Shown as written by the hub - no time zone conversion.
export function formatReadingTime(timestamp: string): string {
  const [date, time] = timestamp.split(' ');
  const [, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${MONTHS[month - 1]} ${ordinal(day)}, ${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}
