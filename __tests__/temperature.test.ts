import { formatTemperature, toUnit } from '@/utils/temperature';

describe('temperature units', () => {
  it('Celsius is shown as sent by the hub', () => {
    expect(toUnit(24.5, 'C')).toBe(24.5);
    expect(formatTemperature(24.5, 'C')).toBe('24.5°C');
    expect(formatTemperature(75.24, 'C')).toBe('75.24°C');
  });

  it('converts to Fahrenheit, at most 2 decimals', () => {
    expect(formatTemperature(0, 'F')).toBe('32°F');
    expect(formatTemperature(100, 'F')).toBe('212°F');
    expect(formatTemperature(-40, 'F')).toBe('-40°F');
    expect(formatTemperature(24.37, 'F')).toBe('75.87°F');
  });
});
