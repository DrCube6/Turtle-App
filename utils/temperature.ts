// The hub reports temperatures in Celsius. Shown in Celsius by default, or
// Fahrenheit when chosen in Config.
export type TemperatureUnit = 'C' | 'F';

export const toUnit = (celsius: number, unit: TemperatureUnit): number =>
  unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;

// 24.5 -> "24.5°C" / "76.1°F" (at most 2 decimals, no trailing zeros);
// "--" when there's no value
export const formatTemperature = (celsius: number, unit: TemperatureUnit): string =>
  Number.isFinite(celsius) ? `${Number(toUnit(celsius, unit).toFixed(2))}°${unit}` : '--';
