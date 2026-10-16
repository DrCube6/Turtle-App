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
export const nodesInData = (rows: SensorData[]): number[] =>
  [...new Set(rows.map(row => row.node))]
    .filter(node => Number.isInteger(node) && node >= 0)
    .sort((a, b) => a - b);
