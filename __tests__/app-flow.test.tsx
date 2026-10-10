// End-to-end simulation: the real app/ screens and router, talking to the
// simulated ESP32 hub from test/fakeHub over the mocked BLE library.
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import path from 'path';
import { Alert } from 'react-native';

import { hub, reading } from '@/test/fakeHub';

const APP_DIR = path.resolve(__dirname, '../app');

jest.setTimeout(30000);

beforeEach(() => {
  hub.reset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const secureStore = require('expo-secure-store');
  secureStore.__store.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function loginAndConnect() {
  const app = renderRouter(APP_DIR, { initialUrl: '/' });

  // Splash -> login
  await screen.findByText('Habitat Login', {}, { timeout: 3000 });
  fireEvent.changeText(screen.getByPlaceholderText('Enter Username'), 'dev');
  fireEvent.changeText(screen.getByPlaceholderText('Enter Password'), '123');
  fireEvent.press(screen.getByText('Login'));

  // Login -> hub scan
  await screen.findByText('Connect to Hub');
  expect(app.getPathname()).toBe('/hub_connect');
  fireEvent.press(screen.getByText('Scan'));
  fireEvent.press(await screen.findByText('Turtle-MC'));

  return app;
}

it('logs in, connects, syncs and shows a node with its 24h graphs', async () => {
  const app = await loginAndConnect();

  // Dashboard pulls the CSV from the hub and lists nodes 1-12
  await screen.findByText('Node 12', {}, { timeout: 5000 });
  expect(app.getPathname()).toBe('/dashboard');
  expect(hub.controlLog).toContain('START');
  for (let n = 1; n <= 12; n++) {
    expect(screen.getByText(`Node ${n}`)).toBeTruthy();
  }
  expect(screen.getByText('97.50%')).toBeTruthy(); // hub (node 0) battery

  // Open node 5
  fireEvent.press(screen.getByText('Node 5'));
  await screen.findByText('Temperature (last 24h)');
  expect(app.getPathname()).toBe('/node');

  // Latest values (hr = 1) at the top
  const latest = reading(5, 1);
  expect(screen.getByText(`${latest.temperature}F`)).toBeTruthy();
  expect(screen.getByText(`${latest.humidity}%`)).toBeTruthy();

  // Two charts: temperature then humidity, 24 points, oldest -> newest
  const [tempChart, humChart] = screen.getAllByTestId('line-chart');
  const hoursOldestFirst = Array.from({ length: 24 }, (_, i) => 24 - i);

  expect(tempChart.props.chartData.datasets[0].data).toEqual(
    hoursOldestFirst.map(hr => reading(5, hr).temperature)
  );
  expect(humChart.props.chartData.datasets[0].data).toEqual(
    hoursOldestFirst.map(hr => reading(5, hr).humidity)
  );
  expect(tempChart.props.chartData.labels[0]).toBe('-24h');
  expect(tempChart.props.chartData.labels[23]).toBe('-1h');
});

it('node view has the bottom nav: Dash returns to the dashboard without re-syncing, Map/Config work', async () => {
  const app = await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });
  const startsBefore = hub.controlLog.filter(c => c === 'START').length;

  fireEvent.press(screen.getByText('Node 3'));
  await screen.findByText('Temperature (last 24h)');
  expect(app.getPathname()).toBe('/node');

  fireEvent.press(screen.getAllByText('Dash').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
  expect(screen.queryByText('Temperature (last 24h)')).toBeNull();
  // Went back to the existing dashboard - no second BLE transfer
  expect(hub.controlLog.filter(c => c === 'START').length).toBe(startsBefore);

  fireEvent.press(screen.getByText('Node 3'));
  await screen.findByText('Temperature (last 24h)');
  fireEvent.press(screen.getAllByText('Map').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/map'));

  // Map's own Dash button pushes a fresh dashboard, which re-syncs first
  fireEvent.press(screen.getAllByText('Dash').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
  fireEvent.press((await screen.findAllByText('Node 3', {}, { timeout: 5000 })).at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/node'));
  fireEvent.press(screen.getAllByText('Config').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/config'));
});

it('sends an unconfigured hub to setup, writes config, then lands on the dashboard', async () => {
  hub.mode = 'config';
  const app = await loginAndConnect();

  await screen.findByText('Initial Setup', {}, { timeout: 5000 });
  expect(app.getPathname()).toBe('/init');

  fireEvent.changeText(screen.getByPlaceholderText('Enter Cloud Username'), 'turtle');
  fireEvent.changeText(screen.getByPlaceholderText('Enter Cloud Password'), 'shell');
  fireEvent.changeText(screen.getByPlaceholderText('Enter WiFi SSID'), 'Beach');
  fireEvent.changeText(screen.getByPlaceholderText('Enter WiFi Password'), 'sand');
  fireEvent.changeText(screen.getByPlaceholderText('Enter Sample Rate'), '30');
  fireEvent.press(screen.getByText('Confirm'));

  await waitFor(() => expect(hub.receivedConfigCsv).not.toBeNull());
  expect(hub.receivedConfigCsv).toContain('WIFI SSID,Beach');
  expect(hub.receivedConfigCsv).toContain('Sample Rate (in Minutes),30');

  // Regression: used to bounce straight back to /init here
  await screen.findByText('Node 1', {}, { timeout: 5000 });
  expect(app.getPathname()).toBe('/dashboard');
});

it('navigates between tabs, and Config > Edit opens the setup form instead of a 404', async () => {
  const app = await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });

  fireEvent.press(screen.getByText('Map'));
  await screen.findByText('Sensor Map');
  expect(app.getPathname()).toBe('/map');
  expect(screen.getByTestId('sensor-map')).toBeTruthy();

  fireEvent.press(screen.getByText('Config'));
  await screen.findByText('Configure');
  expect(app.getPathname()).toBe('/config');

  fireEvent.press(screen.getByText('Edit'));
  await screen.findByText('Initial Setup');
  expect(app.getPathname()).toBe('/init');
  expect(screen.queryByText('404 - Not Found')).toBeNull();
});

it('Config > Log Out clears the session, disconnects the hub and leaves no back history', async () => {
  const secureStore = require('expo-secure-store');
  const app = await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });
  secureStore.__store.set('turtle_app_login_state', '{"status":1,"appKey":"k","hatchery":1}');

  fireEvent.press(screen.getByText('Config'));
  await screen.findByText('Configure');
  fireEvent.press(screen.getByText('Log Out'));

  await waitFor(() => expect(app.getPathname()).toBe('/login'));
  expect(secureStore.__store.has('turtle_app_login_state')).toBe(false);
  expect(hub.connected).toBe(false);
  await screen.findByText('Not logged in');
  expect(screen.queryByText('Configure')).toBeNull();
  expect(screen.queryByText('Dashboard')).toBeNull();
  const { router } = require('expo-router');
  expect(router.canGoBack()).toBe(false);
});

it('clears the hub scan list when leaving Connect to Hub, so it is empty after logout', async () => {
  await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });

  fireEvent.press(screen.getByText('Config'));
  await screen.findByText('Configure');
  fireEvent.press(screen.getByText('Log Out'));
  await screen.findByText('Habitat Login');

  // Log back in - the old scan result must not be listed
  fireEvent.changeText(screen.getAllByPlaceholderText('Enter Username').at(-1)!, 'dev');
  fireEvent.changeText(screen.getAllByPlaceholderText('Enter Password').at(-1)!, '123');
  fireEvent.press(screen.getAllByText('Login').at(-1)!);
  await screen.findByText('Connect to Hub');

  expect(screen.queryByText('Turtle-MC')).toBeNull();
  expect(screen.getByText('No Bluetooth devices found')).toBeTruthy();

  // Scanning still works afterwards
  fireEvent.press(screen.getByText('Scan'));
  expect(await screen.findByText('Turtle-MC')).toBeTruthy();
});

it('auto-logs in from a saved session, and logout clears it and stays on login', async () => {
  const secureStore = require('expo-secure-store');
  secureStore.__store.set(
    'turtle_app_login_state',
    JSON.stringify({ status: 1, appKey: 'saved_key', hatchery: 7 })
  );

  const app = renderRouter(APP_DIR, { initialUrl: '/' });

  // Saved login skips the form
  await screen.findByText('Connect to Hub', {}, { timeout: 3000 });
  expect(app.getPathname()).toBe('/hub_connect');

  fireEvent.press(screen.getByText('Log Out'));

  await waitFor(() => expect(app.getPathname()).toBe('/login'));
  expect(secureStore.__store.has('turtle_app_login_state')).toBe(false);

  // The new login screen re-reads storage on mount; once it has settled on
  // "Not logged in" it must not have bounced us back to the hub screen.
  await screen.findAllByText('Not logged in');
  expect(app.getPathname()).toBe('/login');
});

describe('routing with the real firmware files', () => {
  const fs = require('fs');
  const fixture = (name: string): string =>
    fs.readFileSync(path.join(__dirname, '../test/fixtures', name), 'utf8')
      .replace(/\r?\n/g, '\r\n');

  it('data.csv routes to the dashboard and shows its values', async () => {
    hub.sensorCsv = fixture('data.csv');
    const app = await loginAndConnect();

    await screen.findByText('Node 12', {}, { timeout: 5000 });
    expect(app.getPathname()).toBe('/dashboard');
    expect(screen.getByText('100.00%')).toBeTruthy(); // hub battery, hr 1 node 0

    fireEvent.press(screen.getByText('Node 5'));
    await screen.findByText('Temperature (last 24h)');
    expect(screen.getByText('75.22F')).toBeTruthy();
    expect(screen.getByText('54.21%')).toBeTruthy();
  });

  it('init.csv routes to the setup screen', async () => {
    hub.mode = 'config';
    hub.configCsv = fixture('init.csv');
    const app = await loginAndConnect();

    await screen.findByText('Initial Setup', {}, { timeout: 5000 });
    expect(app.getPathname()).toBe('/init');
  });
});

describe('setup screen waits for the hub to verify the info', () => {
  const { CONFIG_RESULT_TIMING } = require('@/context/BLEContext');
  const original = { ...CONFIG_RESULT_TIMING };

  beforeEach(() => {
    Object.assign(CONFIG_RESULT_TIMING, { settleMs: 50, pollIntervalMs: 50, timeoutMs: 20000 });
  });
  afterEach(() => {
    Object.assign(CONFIG_RESULT_TIMING, original);
  });

  const fillForm = (wifiPass: string) => {
    const field = (placeholder: string) => screen.getAllByPlaceholderText(placeholder).at(-1)!;
    fireEvent.changeText(field('Enter Cloud Username'), 'turtle');
    fireEvent.changeText(field('Enter Cloud Password'), 'shell');
    fireEvent.changeText(field('Enter WiFi SSID'), 'Beach');
    fireEvent.changeText(field('Enter WiFi Password'), wifiPass);
    fireEvent.changeText(field('Enter Sample Rate'), '30');
  };

  it('wrong info: shows waiting, then the rejection, keeps the entries; correct info goes to the dashboard', async () => {
    hub.mode = 'config';
    hub.validationMs = 400;
    hub.acceptConfig = csv => csv.includes('WIFI PASS,correct');
    const app = await loginAndConnect();
    await screen.findByText('Initial Setup', {}, { timeout: 5000 });

    fillForm('wrong');
    fireEvent.press(screen.getByText('Confirm'));

    await screen.findByText('Waiting for hub to verify the information...');
    expect(screen.getByText('Waiting...')).toBeTruthy();

    await screen.findByText(/could not use that information/, {}, { timeout: 5000 });
    expect(app.getPathname()).toBe('/init');
    expect(screen.getByDisplayValue('wrong')).toBeTruthy(); // entries kept
    expect(screen.queryByText('Waiting for hub to verify the information...')).toBeNull();

    // Correct the Wi-Fi password and try again
    fireEvent.changeText(screen.getByPlaceholderText('Enter WiFi Password'), 'correct');
    fireEvent.press(screen.getByText('Confirm'));

    await screen.findByText('Node 12', {}, { timeout: 8000 });
    expect(app.getPathname()).toBe('/dashboard');
    expect(hub.receivedConfigCsv).toContain('WIFI PASS,correct');
  });

  it('Config > Edit with a rejection stays on setup (dashboard underneath must not redirect)', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Config'));
    await screen.findByText('Configure');
    fireEvent.press(screen.getByText('Edit'));
    await screen.findByText('Initial Setup');

    hub.validationMs = 300;
    hub.acceptConfig = () => false;
    fillForm('wrong');
    fireEvent.press(screen.getByText('Confirm'));

    await screen.findByText(/could not use that information/, {}, { timeout: 5000 });
    // Give a background redirect time to (wrongly) remount the screen
    await waitFor(() => expect(hub.mode).toBe('config'));
    expect(app.getPathname()).toBe('/init');
    expect(screen.getByText(/could not use that information/)).toBeTruthy();
    expect(screen.getByDisplayValue('wrong')).toBeTruthy();
  });
});
