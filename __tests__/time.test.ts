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

describe('formatReadingTime', () => {
  const { formatReadingTime } = require('@/utils/time');

  it('formats a hub timestamp as "Oct 29th, 7:28 PM"', () => {
    expect(formatReadingTime('2026-10-29 19:28:29')).toBe('Oct 29th, 7:28 PM');
  });

  it('uses 12-hour time with midnight and noon as 12', () => {
    expect(formatReadingTime('2026-10-29 00:05:00')).toBe('Oct 29th, 12:05 AM');
    expect(formatReadingTime('2026-10-29 09:28:29')).toBe('Oct 29th, 9:28 AM');
    expect(formatReadingTime('2026-10-29 12:00:00')).toBe('Oct 29th, 12:00 PM');
  });

  it('uses the right ordinal for every day', () => {
    const day = (d: number) => formatReadingTime(`2026-01-${String(d).padStart(2, '0')} 10:00:00`).split(',')[0];
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(day)).toEqual([
      'Jan 1st', 'Jan 2nd', 'Jan 3rd', 'Jan 4th', 'Jan 11th', 'Jan 12th',
      'Jan 13th', 'Jan 21st', 'Jan 22nd', 'Jan 23rd', 'Jan 31st',
    ]);
  });

  it('uses the short month names', () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatReadingTime(`2026-${String(i + 1).padStart(2, '0')}-10 10:00:00`).split(' ')[0]
    );
    expect(months).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  });
});
