import { formatSyncedAgo } from '@/utils/time';

const NOW = new Date(2026, 9, 15, 17, 0, 0).getTime();
const ago = (ms: number) => formatSyncedAgo(NOW - ms, NOW);

it('describes how long ago the last sync was', () => {
  expect(formatSyncedAgo(null, NOW)).toBe('Not synced yet');
  expect(ago(5_000)).toBe('Synced just now');
  expect(ago(59_000)).toBe('Synced just now');
  expect(ago(60_000)).toBe('Synced 1 min ago');
  expect(ago(45 * 60_000)).toBe('Synced 45 min ago');
  expect(ago(2 * 3_600_000)).toBe('Synced 2 h ago');
  expect(ago(3 * 86_400_000)).toMatch(/^Synced Oct 12, /);
});
