// Pure CSV helpers for the ESP32 hub transfer - kept free of React/BLE so
// they can be unit tested directly.

// The exact header row the ESP32 sends for real sensor-data CSVs.
// Anything that doesn't match this is treated as the initial/config CSV.
export const SENSOR_CSV_HEADER =
  'HR (Most Recent 1 | Oldest 24),Node ID (#),Battery,Temperature,Humidity';

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
    // Column order: HR, Node ID, Battery, Temperature, Humidity
    const [hr, node, battery, temperature, humidity] = line.split(',');

    return {
      hr: Number(hr),
      node: Number(node),
      battery: Number(battery),
      temperature: Number(temperature),
      humidity: Number(humidity),
    };
  });
};

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
