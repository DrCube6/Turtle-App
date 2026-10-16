import { batteryColor, batteryIconName } from '@/components/BatteryIcon';

describe('battery icon', () => {
  it.each([
    [100, 'battery'],
    [97.5, 'battery'],
    [94, 'battery-90'],
    [58, 'battery-60'],
    [12, 'battery-10'],
    [3, 'battery-alert-variant-outline'],
    [undefined, 'battery-unknown'],
    [NaN, 'battery-unknown'],
  ])('%s%% -> %s', (percent, name) => {
    expect(batteryIconName(percent as number | undefined)).toBe(name);
  });

  it('is green when healthy, yellow when low, red when nearly empty', () => {
    expect(batteryColor(98)).toBe('#22c55e');
    expect(batteryColor(40)).toBe('#eab308');
    expect(batteryColor(15)).toBe('#ef4444');
  });
});
