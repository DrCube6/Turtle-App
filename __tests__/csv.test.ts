import {
  buildConfigCSV,
  detectCSVType,
  parseCSV,
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
    });
  });

  it('skips blank lines instead of producing all-zero rows', () => {
    const csv = `${SENSOR_CSV_HEADER}\n1,5,90,72.5,40\n\n2,5,90,72.4,41\n`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.node === 5)).toBe(true);
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
      hr: 1, node: 5, battery: 98, temperature: 75.22, humidity: 54.21,
    });
    expect(rows.find(r => r.hr === 24 && r.node === 12)).toEqual({
      hr: 24, node: 12, battery: 60, temperature: 77.66, humidity: 57.61,
    });
    expect(rows.every(r => Object.values(r).every(Number.isFinite))).toBe(true);
  });
});
