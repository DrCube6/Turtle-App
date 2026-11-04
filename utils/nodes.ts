import type { SensorData } from '@/utils/csv';

// Node 0 in the CSV is the hub (main controller). It only reports battery -
// no temperature or humidity.
export const HUB_NODE = 0;

export const isHub = (node: number) => node === HUB_NODE;

// "Hub" / "Node 5"
export const nodeLabel = (node: number) => (isHub(node) ? 'Hub' : `Node ${node}`);

// "Hub" / "5" - for small buttons and map badges
export const nodeShortLabel = (node: number) => (isHub(node) ? 'Hub' : String(node));

// Nodes present in the synced CSV, hub first then 1, 2, 3... Only these can
// be placed on the map - a CSV with nodes 1-6 offers just the hub and 1-6.
// Each node's most recent reading: HR 1 normally, or the newest HR it has
// when the latest hours are missing. Nodes with no readings aren't listed.
// A value left blank in that row ("1,9,,77.47,51.53,...") is taken from the
// newest hour that has it, so it never shows as NaN; it stays NaN only when
// the node never reported it.
export const latestReadings = (rows: SensorData[]): SensorData[] => {
  const byNode = new Map<number, SensorData[]>();
  for (const row of rows) {
    byNode.set(row.node, [...(byNode.get(row.node) ?? []), row]);
  }

  return [...byNode.values()]
    .map(nodeRows => {
      const newestFirst = [...nodeRows].sort((a, b) => a.hr - b.hr);
      const newestValue = (pick: (row: SensorData) => number) =>
        newestFirst.map(pick).find(Number.isFinite) ?? NaN;
      return {
        ...newestFirst[0],
        battery: newestValue(row => row.battery),
        temperature: newestValue(row => row.temperature),
        humidity: newestValue(row => row.humidity),
      };
    })
    .sort((a, b) => a.node - b.node);
};

// "96%" / "--" when there's no value
export const formatPercent = (value: number): string =>
  Number.isFinite(value) ? `${value}%` : '--';

// A full reading: battery, temperature, humidity and timestamp all present
const isComplete = (row: SensorData): boolean =>
  Number.isFinite(row.battery) &&
  Number.isFinite(row.temperature) &&
  Number.isFinite(row.humidity) &&
  row.timestamp !== null;

// Reported in the last 24h, but the newest hour (HR 1) is missing or
// incomplete ("1,9,,77.47,51.53,..."): the node has stopped sending
// properly. A node with no readings at all isn't listed anyway.
export const isDisconnected = (rows: SensorData[], node: number): boolean => {
  const nodeRows = rows.filter(row => row.node === node);
  const newest = nodeRows.find(row => row.hr === 1);
  return nodeRows.length > 0 && (!newest || !isComplete(newest));
};

// One graph line for a node, oldest -> newest. It starts at the oldest hour
// that has a value (missing hours before it are left off) and always ends
// at HR 1 (-1h), so the graph reaches the present even when the newest
// hours are missing. Missing hours in that span stay null (a gap).
//   values at HR 9, 8, 3, 2, 1 -> hours [9..1], values [v, v, null x4, v, v, v]
//   values at HR 8..3          -> hours [8..1], values [v x6, null, null]
export const historySeries = (
  rows: SensorData[],
  node: number,
  pick: (row: SensorData) => number
): { hours: number[]; values: (number | null)[] } => {
  const byHour = new Map<number, number>();
  for (const row of rows) {
    const value = pick(row);
    if (row.node === node && row.hr >= 1 && row.hr <= 24 && Number.isFinite(value)) {
      byHour.set(row.hr, value);
    }
  }
  if (byHour.size === 0) return { hours: [], values: [] };

  const oldest = Math.max(...byHour.keys());
  const hours: number[] = [];
  for (let hr = oldest; hr >= 1; hr--) hours.push(hr);
  return { hours, values: hours.map(hr => byHour.get(hr) ?? null) };
};

export const nodesInData = (rows: SensorData[]): number[] =>
  [...new Set(rows.map(row => row.node))]
    .filter(node => Number.isInteger(node) && node >= 0)
    .sort((a, b) => a - b);
