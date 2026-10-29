// Pure CSV helpers for the ESP32 hub transfer - kept free of React/BLE so
// they can be unit tested directly.

// The exact header row the ESP32 sends for real sensor-data CSVs.
// Anything that doesn't match this is treated as the initial/config CSV.
export const SENSOR_CSV_HEADER =
  'Hr,Node,Battery,Temperature,Humidity,Time Stamp';

// Row order the ESP32's init.csv expects - must match exactly
export const CONFIG_FIELD_LABELS = [
  'ID (For Login User)',
  'Password (For Login User)',
  'WIFI SSID',
  'WIFI PASS',
  'AUTH KEY (From Login)',
  'Sample Rate (in Minutes)',
] as const;

export type SensorData = {
  hr: number;
  node: number;
  battery: number;
  temperature: number;
  humidity: number;
  // When the reading was taken, "YYYY-MM-DD HH:mm:ss" - null when the cell
  // is empty/invalid (no data from that node) or the file predates the
  // Time Stamp column
  timestamp: string | null;
};

export type ConfigFields = {
  userId: string;
  userPassword: string;
  wifiSsid: string;
  wifiPass: string;
  authKey: string;
  sampleRate: string;
};

export type CSVType = 'sensor' | 'config' | null;

export const parseCSV = (csv: string): SensorData[] => {
  const lines = csv.trim().split('\n');

  // Remove header, and skip blank lines so they don't become all-zero rows
  const rows = lines.slice(1).filter(line => line.trim().length > 0);

  return rows.map(line => {
    // Column order: HR, Node ID, Battery, Temperature, Humidity, Time Stamp
    const [hr, node, battery, temperature, humidity, timestamp] = line.split(',');

    return {
      hr: Number(hr),
      node: Number(node),
      battery: Number(battery),
      temperature: Number(temperature),
      humidity: Number(humidity),
      timestamp: parseTimestamp(timestamp),
    };
  });
};

// "2026-10-29 19:28:29" -> the same string; also accepts single-digit
// month/day/hour ("2026-10-29 9:28:29", as spreadsheets export it) and
// zero-pads them. Anything else (empty cell, garbage) -> null.
export const parseTimestamp = (raw: string | undefined): string | null => {
  const m = raw
    ?.trim()
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [year, month, day, hour, minute, second] = m.slice(1).map(Number);
  // Reject impossible dates like 2026-02-30 or 25:00:00
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

// True when at least one field node (not the hub, node 0) has a timestamped
// reading - otherwise the hub has nothing real from the nodes to show
export const hasNodeTimestamps = (rows: SensorData[]): boolean =>
  rows.some(row => row.node !== 0 && row.timestamp !== null);

// Header cells of the first line, lowercased and trimmed. Strips a UTF-8 BOM
// and copes with CRLF line endings.
const headerColumns = (csv: string): string[] =>
  (csv.replace(/^﻿/, '').trim().split(/\r?\n/)[0] ?? '')
    .split(',')
    .map(col => col.trim().toLowerCase());

// Identify each CSV by its own header rather than treating "not sensor" as
// config. The firmware has used more than one sensor header, e.g.
//   'HR (Most Recent 1 | Oldest 24),Node ID (#),Battery,Temperature,Humidity'
//   'Hr,Node,Battery,Temperature,Humidity'
// so match each column by prefix. Returns null for anything unrecognised
// (e.g. a corrupted transfer) so it never sends the user to setup by mistake.
export const detectCSVType = (csv: string): CSVType => {
  const cols = headerColumns(csv);

  if (cols[0] === 'parameters' && cols[1] === 'value') {
    return 'config';
  }

  const SENSOR_COLUMNS = ['hr', 'node', 'battery', 'temperature', 'humidity'];
  if (
    cols.length >= SENSOR_COLUMNS.length &&
    SENSOR_COLUMNS.every((name, i) => cols[i].startsWith(name))
  ) {
    return 'sensor';
  }

  return null;
};

export const buildConfigCSV = (fields: ConfigFields): string => {
  const values = [
    fields.userId,
    fields.userPassword,
    fields.wifiSsid,
    fields.wifiPass,
    fields.authKey,
    fields.sampleRate,
  ];

  const rows = CONFIG_FIELD_LABELS.map(
    (label, i) => `${label},${values[i]}`
  );

  return ['Parameters,Value', ...rows].join('\n');
};
