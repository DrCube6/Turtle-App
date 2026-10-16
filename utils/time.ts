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
