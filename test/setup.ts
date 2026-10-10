// Global test bench setup (runs before every test file).

// The BLE layer logs every chunk - keep test output readable.
// warn/error stay on so real problems still show.
console.log = () => {};

// In-memory SecureStore so login persistence works without native code
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// Replace the SVG chart with a plain View that keeps the props, so tests can
// read back exactly which data points the node screen plotted.
jest.mock('react-native-chart-kit', () => require('./mockLineChart'));

jest.mock('expo-navigation-bar', () => ({
  setVisibilityAsync: jest.fn(async () => {}),
  setBehaviorAsync: jest.fn(async () => {}),
}));
