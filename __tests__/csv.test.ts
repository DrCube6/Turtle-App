import {
  buildConfigCSV,
  detectCSVType,
  hasNodeTimestamps,
  parseCSV,
  parseTimestamp,
  SENSOR_CSV_HEADER,
} from '@/utils/csv';
import { makeSensorCsv, UNCONFIGURED_CSV } from '@/test/fakeHub';

describe('detectCSVType', () => {
  it('recognises the sensor header, even with CRLF endings', () => {
    expect(detectCSVType(makeSensorCsv())).toBe('sensor');
  });

  it('treats the unconfigured init CSV as config', () => {
    expect(detectCSVType(UNCONFIGURED_CSV)).toBe('config');
  });
});

describe('parseCSV', () => {
  it('parses every hr/node row from the hub', () => {
    const rows = parseCSV(makeSensorCsv());
    expect(rows).toHaveLength(24 * 13);
    expect(rows[0]).toEqual({
      hr: 1,
      node: 0,
      battery: 97.5,
      temperature: 70.1,
      humidity: 39.9,
      timestamp: '2026-10-29 19:28:29',
    });
  });

  it('an empty Time Stamp cell parses as null', () => {
    const rows = parseCSV(`${SENSOR_CSV_HEADER}\n1,5,90,72.5,40,\n2,5,90,72.4,41\n`);
    expect(rows.map(r => r.timestamp)).toEqual([null, null]);
  });

  it('skips blank lines instead of producing all-zero rows', () => {
    const csv = `${SENSOR_CSV_HEADER}\n1,5,90,72.5,40\n\n2,5,90,72.4,41\n`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.node === 5)).toBe(true);
  });
});

describe('parseTimestamp', () => {
  it('keeps the firmware format as is', () => {
    expect(parseTimestamp('2026-10-29 19:28:29')).toBe('2026-10-29 19:28:29');
    expect(parseTimestamp(' 2026-10-29 19:28:29\r')).toBe('2026-10-29 19:28:29');
  });

  it('zero-pads single-digit parts (spreadsheet export drops the leading zero)', () => {
    expect(parseTimestamp('2026-10-29 9:28:29')).toBe('2026-10-29 09:28:29');
    expect(parseTimestamp('2026-1-5 0:28:29')).toBe('2026-01-05 00:28:29');
  });

  it('returns null for empty, malformed or impossible values', () => {
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('29/10/2026 19:28')).toBeNull();
    expect(parseTimestamp('2026-02-30 10:00:00')).toBeNull();
    expect(parseTimestamp('2026-10-29 24:00:00')).toBeNull();
    expect(parseTimestamp('2026-10-29 10:60:00')).toBeNull();
  });
});

describe('hasNodeTimestamps', () => {
  const row = (node: number, timestamp: string | null) =>
    ({ hr: 1, node, battery: 90, temperature: 70, humidity: 50, timestamp });

  it('ignores the hub: hub-only timestamps count as no node data', () => {
    expect(hasNodeTimestamps([row(0, '2026-10-29 19:28:29'), row(1, null)])).toBe(false);
    expect(hasNodeTimestamps([])).toBe(false);
  });

  it('one field node with a timestamp is enough', () => {
    expect(hasNodeTimestamps([row(0, null), row(1, null), row(7, '2026-10-29 19:28:29')])).toBe(true);
  });
});

describe('buildConfigCSV', () => {
  it('writes the rows in the exact order init.csv expects', () => {
    const csv = buildConfigCSV({
      userId: 'u',
      userPassword: 'p',
      wifiSsid: 's',
      wifiPass: 'w',
      authKey: 'k',
      sampleRate: '15',
    });
    expect(csv.split('\n')).toEqual([
      'Parameters,Value',
      'ID (For Login User),u',
      'Password (For Login User),p',
      'WIFI SSID,s',
      'WIFI PASS,w',
      'AUTH KEY (From Login),k',
      'Sample Rate (in Minutes),15',
    ]);
  });
});

describe('real firmware files (test/fixtures)', () => {
  const fs = require('fs');
  const path = require('path');
  const fixture = (name: string): string =>
    fs.readFileSync(path.join(__dirname, '../test/fixtures', name), 'utf8');
  const crlf = (s: string) => s.replace(/\r?\n/g, '\r\n');

  const dataCsv = fixture('data.csv');
  const initCsv = fixture('init.csv');

  it.each([
    ['LF', (s: string) => s],
    ['CRLF', crlf],
    ['BOM + CRLF', (s: string) => '\uFEFF' + crlf(s)],
  ])('data.csv is sensor and init.csv is config (%s)', (_label, variant) => {
    expect(detectCSVType(variant(dataCsv))).toBe('sensor');
    expect(detectCSVType(variant(initCsv))).toBe('config');
  });

  it('accepts both sensor header styles the firmware has used', () => {
    expect(detectCSVType('Hr,Node,Battery,Temperature,Humidity\n1,1,90,70,50')).toBe('sensor');
    expect(detectCSVType(`${SENSOR_CSV_HEADER}\n1,1,90,70,50`)).toBe('sensor');
    expect(detectCSVType('HR , NODE , BATTERY , TEMPERATURE , HUMIDITY')).toBe('sensor');
  });

  it('returns null (not config) for unrecognised or empty data', () => {
    expect(detectCSVType('')).toBeNull();
    expect(detectCSVType('garbage\x00\x01,more')).toBeNull();
    expect(detectCSVType('Node,Hr,Battery,Temperature,Humidity')).toBeNull();
  });

  it('parses all 312 rows of data.csv with the right values', () => {
    const rows = parseCSV(crlf(dataCsv));
    expect(rows).toHaveLength(24 * 13);
    expect(rows.find(r => r.hr === 1 && r.node === 5)).toEqual({
      hr: 1, node: 5, battery: 98, temperature: 75.22, humidity: 54.21, timestamp: null,
    });
    expect(rows.find(r => r.hr === 24 && r.node === 12)).toEqual({
      hr: 24, node: 12, battery: 60, temperature: 77.66, humidity: 57.61, timestamp: null,
    });
    expect(
      rows.every(r =>
        [r.hr, r.node, r.battery, r.temperature, r.humidity].every(Number.isFinite)
      )
    ).toBe(true);
    // Older firmware file: no Time Stamp column at all
    expect(hasNodeTimestamps(rows)).toBe(false);
  });

  describe('data.csv with timestamps', () => {
    const rows = parseCSV(crlf(fixture('data-timestamps.csv')));

    it('is sensor data with all 312 rows', () => {
      expect(detectCSVType(crlf(fixture('data-timestamps.csv')))).toBe('sensor');
      expect(rows).toHaveLength(24 * 13);
      expect(rows.find(r => r.hr === 1 && r.node === 5)).toEqual({
        hr: 1, node: 5, battery: 96, temperature: 75.24, humidity: 55.67,
        timestamp: '2026-10-29 19:28:29',
      });
    });

    it('every row has a timestamp, one hour apart from hr 1 back to hr 24', () => {
      expect(rows.every(r => r.timestamp !== null)).toBe(true);
      for (let hr = 1; hr <= 24; hr++) {
        const stamps = new Set(rows.filter(r => r.hr === hr).map(r => r.timestamp));
        const expected = new Date(Date.UTC(2026, 9, 29, 19, 28, 29) - (hr - 1) * 3600_000)
          .toISOString().slice(0, 19).replace('T', ' ');
        expect([...stamps]).toEqual([expected]);
      }
      expect(hasNodeTimestamps(rows)).toBe(true);
    });
  });
});
