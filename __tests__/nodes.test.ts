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
