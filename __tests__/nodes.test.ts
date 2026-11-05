import { isHub, nodeLabel, nodeShortLabel, nodesInData } from '@/utils/nodes';

const row = (node: number, hr = 1) => ({ hr, node, battery: 90, temperature: 70, humidity: 50, timestamp: null });

it('names node 0 "Hub"', () => {
  expect(isHub(0)).toBe(true);
  expect(nodeLabel(0)).toBe('Hub');
  expect(nodeShortLabel(0)).toBe('Hub');
  expect(nodeLabel(5)).toBe('Node 5');
  expect(nodeShortLabel(5)).toBe('5');
});

it('lists only the nodes in the CSV, hub first, each once', () => {
  expect(nodesInData([row(3), row(1), row(0), row(3, 2), row(2)])).toEqual([0, 1, 2, 3]);
  expect(nodesInData([row(1), row(6), row(4)])).toEqual([1, 4, 6]);
  expect(nodesInData([])).toEqual([]);
  expect(nodesInData([row(NaN), row(-1), row(2)])).toEqual([2]);
});

describe('latestReadings', () => {
  const { latestReadings } = require('@/utils/nodes');

  it('gives each node its newest reading, even when the latest hours are missing', () => {
    const rows = [row(1, 2), row(0, 1), row(1, 3), row(2, 5), row(2, 4)];
    expect(latestReadings(rows).map((r: any) => [r.node, r.hr])).toEqual([[0, 1], [1, 2], [2, 4]]);
  });

  it('nodes with no rows are not listed', () => {
    expect(latestReadings([row(3), row(7)]).map((r: any) => r.node)).toEqual([3, 7]);
    expect(latestReadings([])).toEqual([]);
  });

  it('data_incomplete.csv: hub and nodes 1-8 only', () => {
    const { parseCSV } = require('@/utils/csv');
    const fs = require('fs');
    const path = require('path');
    const csv = fs.readFileSync(path.join(__dirname, '../test/fixtures/data_incomplete.csv'), 'utf8');
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(9 * 8); // hub + 8 nodes, hours 1-8
    expect(latestReadings(rows).map((r: any) => r.node)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(nodesInData(rows)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('disconnected nodes and graph gaps', () => {
  const { historySeries, isDisconnected } = require('@/utils/nodes');
  // Readings only at the given hours
  const rowsAt = (node: number, hrs: number[]) =>
    hrs.map(hr => ({ hr, node, battery: 90, temperature: 20 + hr, humidity: 50, timestamp: '2026-10-29 19:28:29' as string | null }));

  it('a node with readings but none in the newest hour is disconnected', () => {
    const rows = [...rowsAt(1, [1, 2, 3]), ...rowsAt(9, [3, 4, 5])];
    expect(isDisconnected(rows, 1)).toBe(false);
    expect(isDisconnected(rows, 9)).toBe(true);
    expect(isDisconnected(rows, 4)).toBe(false); // no readings at all: not listed, not "disconnected"
  });

  it('an incomplete newest hour (any of battery, temperature, humidity, timestamp missing) is disconnected', () => {
    for (const blank of ['battery', 'temperature', 'humidity', 'timestamp'] as const) {
      const rows = rowsAt(9, [1, 2, 3]);
      (rows[0] as any)[blank] = blank === 'timestamp' ? null : NaN;
      expect(isDisconnected(rows, 9)).toBe(true);
    }
    // Incomplete in an older hour only: still connected
    const rows = rowsAt(9, [1, 2, 3]);
    rows[1].battery = NaN;
    expect(isDisconnected(rows, 9)).toBe(false);
  });

  it('data at hours 1, 2, 3, 8, 9: graph spans samples -9..-1 with gaps only at 4-7', () => {
    const { hours, values } = historySeries(rowsAt(1, [1, 2, 3, 8, 9]), 1, (r: any) => r.temperature);
    expect(hours).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(values).toEqual([29, 28, null, null, null, null, 23, 22, 21]);
  });

  it('every node spans the last sample in the CSV down to sample -1: its missing hours are gaps', () => {
    const rows = [...rowsAt(9, [3, 4, 5, 6, 7, 8]), ...rowsAt(2, [1, 2, 3, 4, 5, 6, 7, 8, 9])];
    const { hours, values } = historySeries(rows, 9, (r: any) => r.temperature);
    expect(hours).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(values).toEqual([null, 28, 27, 26, 25, 24, 23, null, null]);
  });

  it('sampleCount is the highest HR with a reading from any node', () => {
    const { sampleCount } = require('@/utils/nodes');
    expect(sampleCount([])).toBe(0);
    expect(sampleCount(rowsAt(1, [1, 2, 3]))).toBe(3);
    expect(sampleCount([...rowsAt(1, [1, 2]), ...rowsAt(0, [1, 2, 3, 4, 5])])).toBe(5);
  });

  it('a value missing only in one column (NaN) is a gap in that graph only', () => {
    const rows = rowsAt(2, [1, 2, 3]);
    rows[1].humidity = NaN; // hr 2
    expect(historySeries(rows, 2, (r: any) => r.humidity).values).toEqual([50, null, 50]);
    expect(historySeries(rows, 2, (r: any) => r.temperature).values).toEqual([23, 22, 21]);
  });

  it('no readings: empty series (no graph)', () => {
    expect(historySeries([], 3, (r: any) => r.temperature)).toEqual({ hours: [], values: [] });
  });
});

describe('a value blank in the newest row', () => {
  const { latestReadings, formatPercent } = require('@/utils/nodes');

  it('takes it from the newest hour that has it, per value', () => {
    const rows = [
      { hr: 1, node: 9, battery: NaN, temperature: 77.47, humidity: 51.53, timestamp: '2026-10-29 19:28:29' },
      { hr: 2, node: 9, battery: 96, temperature: 70.19, humidity: 54.55, timestamp: '2026-10-29 18:28:29' },
    ];
    expect(latestReadings(rows)[0]).toEqual({ ...rows[0], battery: 96 });
  });

  it('stays NaN (shown as "--") when the node never reported it', () => {
    const rows = [{ hr: 1, node: 4, battery: NaN, temperature: 70, humidity: 50, timestamp: null }];
    expect(latestReadings(rows)[0].battery).toBeNaN();
    expect(formatPercent(NaN)).toBe('--');
    expect(formatPercent(96)).toBe('96%');
  });
});
