// End-to-end simulation: the real app/ screens and router, talking to the
// simulated ESP32 hub from test/fakeHub over the mocked BLE library.
import {
  act,
  fireEvent,
  within,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import path from 'path';
import { Alert, StyleSheet } from 'react-native';

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

// The node view hides its bottom bar behind "Fetching Node X" until both
// graphs have drawn. jest has no layout, so report them drawn ourselves.
async function finishNodeLoading() {
  await screen.findAllByTestId('node-content');
  for (const id of ['temperature-chart', 'humidity-chart']) {
    const chart = screen.queryAllByTestId(id).at(-1);
    if (chart) {
      fireEvent(chart, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 180 } } });
    }
  }
  await waitFor(() => expect(screen.queryByTestId('node-loading')).toBeNull());
}

// Press a button in the most recent Alert.alert popup (handlers may be async)
async function answerAlert(buttonText: string) {
  const [, , buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1);
  await act(async () => {
    await buttons.find((b: any) => b.text === buttonText).onPress?.();
  });
}

async function loginAndConnect() {
  const app = renderRouter(APP_DIR, { initialUrl: '/' });

  // Splash -> login
  await screen.findByText('Welcome!', {}, { timeout: 3000 });
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
  await finishNodeLoading(); // graphs drawn -> bottom bar usable
  expect(app.getPathname()).toBe('/node');

  fireEvent.press(screen.getAllByText('Dash').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
  expect(screen.queryByText('Temperature (last 24h)')).toBeNull();
  // Went back to the existing dashboard - no second BLE transfer
  expect(hub.controlLog.filter(c => c === 'START').length).toBe(startsBefore);

  fireEvent.press(screen.getByText('Node 3'));
  await screen.findByText('Temperature (last 24h)');
  await finishNodeLoading(); // graphs drawn -> bottom bar usable
  fireEvent.press(screen.getAllByText('Map').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/map'));

  // Map's Dash goes back to the existing dashboard - no re-sync either
  const startsBeforeMapDash = hub.controlLog.filter(c => c === 'START').length;
  fireEvent.press(screen.getAllByText('Dash').at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
  expect(hub.controlLog.filter(c => c === 'START').length).toBe(startsBeforeMapDash);
  fireEvent.press((await screen.findAllByText('Node 3', {}, { timeout: 5000 })).at(-1)!);
  await waitFor(() => expect(app.getPathname()).toBe('/node'));
  await finishNodeLoading(); // graphs drawn -> bottom bar usable
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

it('navigates between tabs; Config shows the new settings layout', async () => {
  const app = await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });

  fireEvent.press(screen.getByText('Map'));
  await screen.findByTestId('sensor-map');
  expect(app.getPathname()).toBe('/map');
  expect(screen.getByTestId('sensor-map')).toBeTruthy();

  fireEvent.press(screen.getByText('Config'));
  await screen.findByText('Configure');
  expect(app.getPathname()).toBe('/config');

  // Header buttons and the old password field are gone
  expect(screen.queryByText('Edit')).toBeNull();
  expect(screen.queryByPlaceholderText('Enter Password')).toBeNull();

  expect(screen.getByText('Dark theme')).toBeTruthy();
  // The location box became a single button; all actions sit at the bottom
  expect(screen.queryByText('Costa Rica')).toBeNull();
  expect(screen.getByText('Change Default Map Location')).toBeTruthy();
  expect(screen.getByText('Reset All Map Node Locations')).toBeTruthy();
  expect(screen.getByText('Disconnect')).toBeTruthy();

  // The theme switch toggles (it isn't wired to anything yet)
  const toggle = screen.getByTestId('dark-theme-switch');
  expect(toggle.props.value).toBe(true);
  fireEvent(toggle, 'valueChange', false);
  expect(screen.getByTestId('dark-theme-switch').props.value).toBe(false);
});

it('Config > Disconnect drops the hub but stays logged in, back on Connect to Hub', async () => {
  const secureStore = require('expo-secure-store');
  const app = await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });
  secureStore.__store.set('turtle_app_login_state', '{"status":1,"appKey":"k","hatchery":1}');

  fireEvent.press(screen.getByText('Config'));
  await screen.findByText('Configure');
  expect(screen.queryByText('Log Out')).toBeNull(); // only Connect to Hub logs out
  fireEvent.press(screen.getByText('Disconnect'));
  await answerAlert('Disconnect'); // confirm the popup

  await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'));
  expect(hub.connected).toBe(false);
  expect(secureStore.__store.has('turtle_app_login_state')).toBe(true); // still logged in
  // Dashboard/config were closed, not left underneath
  expect(screen.queryByText('Configure')).toBeNull();
  expect(screen.queryByText('Node 12')).toBeNull();
});

it('clears the hub scan list when leaving Connect to Hub, so it is empty after disconnecting', async () => {
  await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });

  fireEvent.press(screen.getByText('Config'));
  await screen.findByText('Configure');
  fireEvent.press(screen.getByText('Disconnect'));
  await answerAlert('Disconnect'); // confirm the popup
  await screen.findByText('Connect to Hub');

  // The old scan result must not be listed
  expect(screen.queryByText('Turtle-MC')).toBeNull();
  expect(screen.getByText('No Bluetooth devices found')).toBeTruthy();

  // Scanning and reconnecting work afterwards
  fireEvent.press(screen.getByText('Scan'));
  fireEvent.press(await screen.findByText('Turtle-MC'));
  expect(await screen.findByText('Node 12', {}, { timeout: 5000 })).toBeTruthy();
});

it('Initial Setup > Disconnect (even while waiting for the hub) returns to Connect to Hub, still logged in', async () => {
  const secureStore = require('expo-secure-store');
  const { CONFIG_RESULT_TIMING } = require('@/context/BLEContext');
  const original = { ...CONFIG_RESULT_TIMING };
  Object.assign(CONFIG_RESULT_TIMING, { settleMs: 50, pollIntervalMs: 50, timeoutMs: 20000 });
  try {
    hub.mode = 'config';
    hub.validationMs = 10 * 60 * 1000; // hub never decides
    const app = await loginAndConnect();
    await screen.findByText('Initial Setup', {}, { timeout: 5000 });
    secureStore.__store.set('turtle_app_login_state', '{"status":1,"appKey":"k","hatchery":1}');

    for (const [placeholder, value] of [
      ['Enter Cloud Username', '1'], ['Enter Cloud Password', '1'], ['Enter WiFi SSID', '1'],
      ['Enter WiFi Password', '1'], ['Enter Sample Rate', '1'],
    ]) {
      fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);
    }
    fireEvent.press(screen.getByText('Confirm'));
    await screen.findByText('Waiting for hub to verify the information...');

    fireEvent.press(screen.getByText('Disconnect'));

    await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'));
    expect(hub.connected).toBe(false);
    expect(secureStore.__store.has('turtle_app_login_state')).toBe(true);
    expect(screen.queryByText('Initial Setup')).toBeNull();
  } finally {
    Object.assign(CONFIG_RESULT_TIMING, original);
  }
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

    const borderOf = (placeholder: string) =>
      StyleSheet.flatten(screen.getByPlaceholderText(placeholder).props.style)?.borderTopColor; // Tamagui expands borderColor per side
    const wifiFields = ['Enter WiFi SSID', 'Enter WiFi Password'];
    const otherFields = ['Enter Cloud Username', 'Enter Cloud Password', 'Enter Sample Rate'];

    fillForm('wrong');
    wifiFields.forEach(f => expect(borderOf(f)).not.toBe('red'));
    fireEvent.press(screen.getByText('Confirm'));

    await screen.findByText('Waiting for hub to verify the information...');
    expect(screen.getByText('Waiting...')).toBeTruthy();

    await screen.findByText(/hub could not connect/, {}, { timeout: 5000 });
    expect(app.getPathname()).toBe('/init');
    expect(screen.getByDisplayValue('wrong')).toBeTruthy(); // entries kept
    expect(screen.queryByText('Waiting for hub to verify the information...')).toBeNull();

    // Only the WiFi fields get the red outline
    wifiFields.forEach(f => expect(borderOf(f)).toBe('red'));
    otherFields.forEach(f => expect(borderOf(f)).not.toBe('red'));

    // Correct the Wi-Fi password and try again - outline clears on Confirm
    fireEvent.changeText(screen.getByPlaceholderText('Enter WiFi Password'), 'correct');
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => wifiFields.forEach(f => expect(borderOf(f)).not.toBe('red')));

    await screen.findByText('Node 12', {}, { timeout: 8000 });
    expect(app.getPathname()).toBe('/dashboard');
    expect(hub.receivedConfigCsv).toContain('WIFI PASS,correct');
  });

  it('setup opened over the dashboard: a rejection stays on setup (dashboard underneath must not redirect)', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    // Config no longer has an Edit button; open setup on top of the
    // dashboard directly to keep covering the dashboard's focus guard
    const { router } = require('expo-router');
    act(() => router.push('/init'));
    await screen.findByText('Initial Setup');

    hub.validationMs = 300;
    hub.acceptConfig = () => false;
    fillForm('wrong');
    fireEvent.press(screen.getByText('Confirm'));

    await screen.findByText(/hub could not connect/, {}, { timeout: 5000 });
    // Give a background redirect time to (wrongly) remount the screen
    await waitFor(() => expect(hub.mode).toBe('config'));
    expect(app.getPathname()).toBe('/init');
    expect(screen.getByText(/hub could not connect/)).toBeTruthy();
    expect(screen.getByDisplayValue('wrong')).toBeTruthy();
  });
});

describe('no data from the hub on connect', () => {
  it('silent hub: disconnects and returns to Connect to Hub with an explanation', async () => {
    hub.mode = 'silent';
    const app = await loginAndConnect();

    await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
    // 1 START + 5 resends at 1.5s each before giving up
    await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'), { timeout: 15000 });
    expect(hub.connected).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('No data from hub', expect.stringContaining('did not send any data'));
    // The generic transfer alert is suppressed in favour of the one above
    expect(Alert.alert).not.toHaveBeenCalledWith('Transfer failed', expect.anything());
    // Nothing stale left on the hub screen; scanning works again
    expect(screen.queryByText('Turtle-MC')).toBeNull();
    fireEvent.press(screen.getAllByText('Scan').at(-1)!);
    expect(await screen.findByText('Turtle-MC')).toBeTruthy();
  });

  it('unrecognised file on connect: disconnects and returns to Connect to Hub', async () => {
    hub.sensorCsv = 'Some,Other,File\n1,2,3';
    const app = await loginAndConnect();
    await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));

    await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'), { timeout: 5000 });
    expect(hub.connected).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('No data from hub', expect.stringContaining('does not recognise'));
  });

  it('with data already loaded, a failed manual Sync keeps the connection and the data', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });

    expect(Alert.alert).not.toHaveBeenCalled();
    hub.mode = 'silent';
    fireEvent.press(screen.getByText('Sync'));
    await waitFor(
      () => expect(Alert.alert).toHaveBeenCalledWith('Transfer failed', expect.anything()),
      { timeout: 15000 }
    );

    expect(app.getPathname()).toBe('/dashboard');
    expect(hub.connected).toBe(true);
    expect(await screen.findByText('Node 12')).toBeTruthy();
  });
});

it('flaky first connects: shows Connecting... and still reaches the dashboard', async () => {
  hub.failConnects = 2;
  const app = renderRouter(APP_DIR, { initialUrl: '/' });
  await screen.findByText('Welcome!', {}, { timeout: 3000 });
  fireEvent.changeText(screen.getByPlaceholderText('Enter Username'), 'dev');
  fireEvent.changeText(screen.getByPlaceholderText('Enter Password'), '123');
  fireEvent.press(screen.getByText('Login'));
  await screen.findByText('Connect to Hub');
  fireEvent.press(screen.getByText('Scan'));
  fireEvent.press(await screen.findByText('Turtle-MC'));

  expect(await screen.findByText('Connecting to Turtle-MC...')).toBeTruthy();
  await screen.findByText('Node 12', {}, { timeout: 8000 });
  expect(app.getPathname()).toBe('/dashboard');
  expect(hub.connectAttempts).toBe(3);
  expect(Alert.alert).not.toHaveBeenCalled();
});

describe('map: placing nodes with long press', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const BEACH = { latitude: 10.54, longitude: -83.5 }; // Tortuguero
  const OTHER = { latitude: 9.9, longitude: -85.68 }; // Ostional

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const openMap = async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    return app;
  };
  const longPress = (coordinate: object) =>
    fireEvent(screen.getByTestId('sensor-map'), 'longPress', { nativeEvent: { coordinate } });
  const tapMarker = (node: number) =>
    fireEvent.press(screen.getByTestId(`node-marker-${node}`), {
      stopPropagation: () => {},
      nativeEvent: {},
    });
  const saved = async () =>
    JSON.parse((await AsyncStorage.getItem('turtle_node_placements')) ?? '{}');

  it('long press shows a pin and the node row; picking a node and ✓ places it and saves it', async () => {
    await openMap();

    longPress(BEACH);
    expect(screen.getByTestId('pending-pin').props.coordinate).toEqual(BEACH);
    expect(screen.getByText('Place node')).toBeTruthy();
    expect(screen.queryByText('Dash')).toBeNull(); // panel replaces the nav bar
    for (let n = 1; n <= 12; n++) expect(screen.getByTestId(`place-node-${n}`)).toBeTruthy();
    expect(screen.getByText('Choose a node to place at the pin.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('place-node-5'));
    expect(screen.getByText('Node 5 will be placed at the pin.')).toBeTruthy();
    fireEvent.press(screen.getByText('✓ Place'));

    await waitFor(() => expect(screen.getByTestId('node-marker-5')).toBeTruthy());
    expect(screen.getByTestId('node-marker-5').props.coordinate).toEqual(BEACH);
    expect(screen.queryByTestId('pending-pin')).toBeNull();
    expect(screen.getByText('Dash')).toBeTruthy(); // nav bar back
    expect(await saved()).toEqual({ 5: BEACH });
  });

  it('dragging the pin changes where the node is placed', async () => {
    await openMap();
    longPress(BEACH);
    fireEvent(screen.getByTestId('pending-pin'), 'dragEnd', { nativeEvent: { coordinate: OTHER } });
    fireEvent.press(screen.getByTestId('place-node-2'));
    fireEvent.press(screen.getByText('✓ Place'));

    await waitFor(() => expect(screen.getByTestId('node-marker-2').props.coordinate).toEqual(OTHER));
  });

  it('placing a node that is already on the map moves it', async () => {
    await openMap();
    longPress(BEACH);
    fireEvent.press(screen.getByTestId('place-node-5'));
    fireEvent.press(screen.getByText('✓ Place'));
    await waitFor(() => expect(screen.getByTestId('node-marker-5')).toBeTruthy());

    longPress(OTHER);
    fireEvent.press(screen.getByTestId('place-node-5'));
    expect(screen.getByText('Confirm to reposition Node 5')).toBeTruthy();
    fireEvent.press(screen.getByText('✓ Move'));

    await waitFor(() => expect(screen.getByTestId('node-marker-5').props.coordinate).toEqual(OTHER));
    expect(screen.getAllByTestId('node-marker-5')).toHaveLength(1);
    expect(await saved()).toEqual({ 5: OTHER });
  });

  it('✕ cancels without placing anything', async () => {
    await openMap();
    longPress(BEACH);
    fireEvent.press(screen.getByTestId('place-node-7'));
    fireEvent.press(screen.getByText('✕ Cancel'));

    expect(screen.queryByTestId('pending-pin')).toBeNull();
    expect(screen.queryByTestId('node-marker-7')).toBeNull();
    expect(screen.getByText('Dash')).toBeTruthy();
    expect(await saved()).toEqual({});
  });

  it.each([
    ['temperature', 'info-temperature'],
    ['humidity', 'info-humidity'],
  ])('tapping a marker shows its readings; tapping the %s opens the node view', async (_name, buttonId) => {
    const app = await openMap();
    longPress(BEACH);
    fireEvent.press(screen.getByTestId('place-node-5'));
    fireEvent.press(screen.getByText('✓ Place'));
    await waitFor(() => expect(screen.getByTestId('node-marker-5')).toBeTruthy());

    tapMarker(5);
    const latest = reading(5, 1);
    expect(screen.getByText('Node 5')).toBeTruthy();
    expect(screen.getByText(`${latest.battery}%`)).toBeTruthy();
    expect(screen.getByTestId('battery-icon')).toBeTruthy();
    expect(within(screen.getByTestId('info-temperature')).getByText(`${latest.temperature}°F`)).toBeTruthy();
    expect(within(screen.getByTestId('info-close')).getByText('✕ Close')).toBeTruthy();
    expect(within(screen.getByTestId('info-humidity')).getByText(`${latest.humidity}%`)).toBeTruthy();
    expect(screen.queryByText(/humidity$/)).toBeNull(); // "humidity" label removed
    expect(screen.queryByText('View full data')).toBeNull(); // replaced by the reading buttons

    fireEvent.press(screen.getByTestId(buttonId));
    await screen.findByText('Temperature (last 24h)');
    expect(app.getPathname()).toBe('/node');
    expect(screen.getAllByText(`${latest.temperature}F`).length).toBeGreaterThan(0);
  });

  it('closing the info panel (✕ or tapping the map) brings the nav bar back', async () => {
    await openMap();
    longPress(BEACH);
    fireEvent.press(screen.getByTestId('place-node-3'));
    fireEvent.press(screen.getByText('✓ Place'));
    await waitFor(() => expect(screen.getByTestId('node-marker-3')).toBeTruthy());

    tapMarker(3);
    fireEvent.press(screen.getByTestId('info-close'));
    expect(screen.getByText('Dash')).toBeTruthy();

    tapMarker(3);
    fireEvent(screen.getByTestId('sensor-map'), 'press', { nativeEvent: { action: 'press' } });
    expect(screen.getByText('Dash')).toBeTruthy();
  });

  it('placed nodes are still there after the app restarts', async () => {
    await AsyncStorage.setItem('turtle_node_placements', JSON.stringify({ 4: BEACH, 9: OTHER }));
    await openMap();

    await waitFor(() => expect(screen.getByTestId('node-marker-4').props.coordinate).toEqual(BEACH));
    expect(screen.getByTestId('node-marker-9').props.coordinate).toEqual(OTHER);
  });
});

describe('dashboard sync progress and battery icons', () => {
  it('shows a loading bar with chunk progress while syncing', async () => {
    hub.dropOnce = new Set([5, 6]); // stalls the transfer until the retry
    await loginAndConnect();

    const total = hub.chunks.length;
    expect(await screen.findByText(`${total - 2} / ${total} chunks (${Math.round(((total - 2) / total) * 100)}%)`)).toBeTruthy();
    expect(screen.getByTestId('sync-progress-bar')).toBeTruthy();

    await screen.findByText('Node 12', {}, { timeout: 8000 });
    expect(screen.queryByTestId('sync-progress-bar')).toBeNull();
  });

  it('shows a battery icon next to every battery percentage on the dashboard and node view', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    // hub + node average + 12 nodes
    expect(screen.getAllByTestId('battery-icon')).toHaveLength(14);

    fireEvent.press(screen.getByText('Node 5'));
    await screen.findByText('Temperature (last 24h)');
    expect(screen.getAllByTestId('battery-icon').length).toBeGreaterThanOrEqual(1);
  });
});

describe('map: hub and available nodes', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const SPOT = { latitude: 10.54, longitude: -83.5 };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const openMap = async () => {
    await loginAndConnect();
    // Wait for the synced node list (which nodes depends on the CSV)
    await screen.findAllByText(/^Node \d+$/, {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
  };
  const longPress = () =>
    fireEvent(screen.getByTestId('sensor-map'), 'longPress', { nativeEvent: { coordinate: SPOT } });

  it('the hub can be placed, is labelled "Hub", and tapping it shows no data panel', async () => {
    await openMap();
    longPress();

    const hubButton = screen.getByTestId('place-node-0');
    expect(within(hubButton).getByText('Hub')).toBeTruthy();
    fireEvent.press(hubButton);
    expect(screen.getByText('Hub will be placed at the pin.')).toBeTruthy();
    fireEvent.press(screen.getByText('✓ Place'));

    await waitFor(() => expect(screen.getByTestId('node-marker-0')).toBeTruthy());
    expect(within(screen.getByTestId('node-marker-0')).getByText('Hub')).toBeTruthy();

    fireEvent.press(screen.getByTestId('node-marker-0'), { stopPropagation: () => {}, nativeEvent: {} });
    expect(screen.queryByTestId('info-close')).toBeNull(); // no info panel
    expect(screen.getByText('Dash')).toBeTruthy(); // nav bar still showing
  });

  it('a CSV with only nodes 1-6 offers only nodes 1-6 to place', async () => {
    const lines = ['Hr,Node,Battery,Temperature,Humidity'];
    for (let hr = 1; hr <= 24; hr++) {
      for (let node = 1; node <= 6; node++) {
        const r = reading(node, hr);
        lines.push(`${hr},${node},${r.battery},${r.temperature},${r.humidity}`);
      }
    }
    hub.sensorCsv = lines.join('\r\n');
    await openMap();
    longPress();

    for (let n = 1; n <= 6; n++) expect(screen.getByTestId(`place-node-${n}`)).toBeTruthy();
    for (const n of [0, 7, 8, 12]) expect(screen.queryByTestId(`place-node-${n}`)).toBeNull();
  });
});

describe('main controller disconnecting on its own', () => {
  const LOST = 'The main controller was disconnected. Scan and connect to reconnect.';

  it.each([
    ['dashboard', async () => {}],
    ['map', async () => {
      fireEvent.press(screen.getByText('Map'));
      await screen.findByTestId('sensor-map');
    }],
    ['node view', async () => {
      fireEvent.press(screen.getByText('Node 5'));
      await screen.findByText('Temperature (last 24h)');
    }],
    ['config', async () => {
      fireEvent.press(screen.getByText('Config'));
      await screen.findByText('Configure');
    }],
  ])('from the %s: returns to Connect to Hub with a red message', async (_name, goThere) => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    await goThere();

    act(() => hub.dropConnection());

    await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'));
    expect(await screen.findByText(LOST)).toBeTruthy();
    expect(screen.queryByText('Node 12')).toBeNull();
  });

  it('the message clears on the next Scan', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    act(() => hub.dropConnection());
    await screen.findByText(LOST);

    fireEvent.press(screen.getAllByText('Scan').at(-1)!);
    await waitFor(() => expect(screen.queryByText(LOST)).toBeNull());
  });

  it('a deliberate Disconnect shows no "disconnected" message', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Config'));
    await screen.findByText('Configure');
    fireEvent.press(screen.getByText('Disconnect'));
    await answerAlert('Disconnect'); // confirm the popup

    await screen.findByText('Connect to Hub');
    expect(screen.queryByText(LOST)).toBeNull();
  });
});

describe('dashboard sync time and pull to refresh', () => {
  it('shows "Synced just now" after syncing', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    expect(screen.getByTestId('synced-ago')).toHaveTextContent('Synced just now');
    expect(screen.getByText('Sync')).toBeTruthy(); // button kept
  });

  it('pulling down on the node list starts a sync', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    const starts = hub.controlLog.filter(c => c === 'START').length;

    // The pull-down gesture fires the RefreshControl's refresh event
    const { RefreshControl } = require('react-native');
    fireEvent(screen.UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() =>
      expect(hub.controlLog.filter(c => c === 'START').length).toBe(starts + 1)
    );
    // Let the sync finish before the test ends - a transfer still running
    // would leak into the next test
    await waitFor(() => expect(screen.queryByTestId('sync-progress-bar')).toBeNull(), { timeout: 5000 });
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    expect(screen.getByTestId('synced-ago')).toHaveTextContent('Synced just now');
  });
});

describe('map remembers where it was left', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const MapView = require('react-native-maps').default;
  const VIEW = { latitude: 10.5, longitude: -83.5, latitudeDelta: 0.2, longitudeDelta: 0.2 };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // jest has no native map, so report ready + sized ourselves
  const readyTheMap = () => {
    fireEvent(screen.getByTestId('sensor-map-container'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 500 } },
    });
    fireEvent(screen.getByTestId('sensor-map'), 'mapReady');
  };

  it('first visit fits Costa Rica; panning saves the view; coming back restores it', async () => {
    const fit = jest.spyOn(MapView.prototype, 'fitToCoordinates').mockImplementation(() => {});
    const toRegion = jest.spyOn(MapView.prototype, 'animateToRegion').mockImplementation(() => {});
    jest.spyOn(MapView.prototype, 'setCamera').mockImplementation(() => {});
    jest.spyOn(MapView.prototype, 'getCamera').mockRejectedValue(new Error('no native map'));

    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    readyTheMap();
    await waitFor(() => expect(fit).toHaveBeenCalledTimes(1));

    // User pans/zooms
    fireEvent(screen.getByTestId('sensor-map'), 'regionChangeComplete', VIEW);
    await waitFor(async () =>
      expect(JSON.parse(await AsyncStorage.getItem('turtle_map_view'))).toEqual({ region: VIEW })
    );

    // Away and back - a fresh map opens where it was left, not on Costa Rica
    fireEvent.press(screen.getByText('Dash'));
    await screen.findAllByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getAllByText('Map').at(-1)!);
    await waitFor(() => expect(screen.getAllByTestId('sensor-map').length).toBeGreaterThan(0));
    const maps = screen.getAllByTestId('sensor-map-container');
    fireEvent(maps.at(-1)!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 500 } } });
    fireEvent(screen.getAllByTestId('sensor-map').at(-1)!, 'mapReady');

    await waitFor(() => expect(toRegion).toHaveBeenCalledWith(VIEW, 0));
    expect(fit).toHaveBeenCalledTimes(1); // no re-fit to Costa Rica
  });

  it('restores the exact camera when one was saved', async () => {
    const camera = { center: { latitude: 9.9, longitude: -85.7 }, zoom: 12.5, heading: 30, pitch: 0 };
    await AsyncStorage.setItem('turtle_map_view', JSON.stringify({ camera, region: VIEW }));
    const setCam = jest.spyOn(MapView.prototype, 'setCamera').mockImplementation(() => {});
    jest.spyOn(MapView.prototype, 'fitToCoordinates').mockImplementation(() => {});

    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    readyTheMap();

    await waitFor(() => expect(setCam).toHaveBeenCalledWith(camera));
  });
});

describe('returning to the dashboard does not re-sync', () => {
  const starts = () => hub.controlLog.filter(c => c === 'START').length;

  it.each([
    ['Map', async () => {
      fireEvent.press(screen.getByText('Map'));
      await screen.findByTestId('sensor-map');
    }],
    ['Config', async () => {
      fireEvent.press(screen.getByText('Config'));
      await screen.findByText('Configure');
    }],
    ['Map then Config', async () => {
      fireEvent.press(screen.getByText('Map'));
      await screen.findByTestId('sensor-map');
      fireEvent.press(screen.getAllByText('Config').at(-1)!);
      await screen.findByText('Configure');
    }],
  ])('Dashboard -> %s -> Dash is instant and keeps the data', async (_name, goAway) => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    const synced = starts();

    await goAway();
    fireEvent.press(screen.getAllByText('Dash').at(-1)!);

    await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
    expect(starts()).toBe(synced); // no new transfer
    expect(screen.queryByTestId('sync-progress-bar')).toBeNull();
    expect(screen.getByText('Node 12')).toBeTruthy();
    // Went back to the same dashboard rather than stacking new ones
    const { router } = require('expo-router');
    act(() => router.back());
    await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'));
  });

  it('the Sync button still fetches the newest CSV', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    fireEvent.press(screen.getAllByText('Dash').at(-1)!);
    await screen.findByText('Sync');
    const synced = starts();

    fireEvent.press(screen.getByText('Sync'));

    await waitFor(() => expect(starts()).toBe(synced + 1));
    await waitFor(() => expect(screen.queryByTestId('sync-progress-bar')).toBeNull(), { timeout: 5000 });
    await screen.findByText('Node 12', {}, { timeout: 5000 });
  });
});

describe('node view graphs', () => {
  const openNode5 = async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Node 5'));
    await screen.findByText('Temperature (last 24h)');
  };

  it('stretches the 24 points to the right edge and keeps the y labels tight on the left', async () => {
    await openNode5();
    const container = screen.getByTestId('temperature-chart');
    fireEvent(container, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 180 } } });

    const chart = within(container).getByTestId('line-chart');
    // chart-kit puts the last of n points at
    //   labelArea + (n-1)/n * (chartWidth - labelArea)
    const labelArea = 44;
    const n = 24;
    const lastX = labelArea + ((n - 1) / n) * (chart.props.chartWidth - labelArea);
    expect(lastX).toBeCloseTo(280 - 14, 5); // newest point near the right edge
  });

  it('tapping a point shows its value and time; tapping it again hides it', async () => {
    await openNode5();
    const tempChart = within(screen.getByTestId('temperature-chart')).getByTestId('line-chart');

    // 3rd point from the left = 22 hours ago
    act(() => tempChart.props.onDataPointClick({ index: 2, value: 0, x: 80, y: 90 }));
    const tooltip = screen.getByTestId('temperature-chart-tooltip');
    expect(within(tooltip).getByText(`${reading(5, 22).temperature}F`)).toBeTruthy();
    expect(within(tooltip).getByText('-22h')).toBeTruthy();

    // Humidity has its own tooltip with its own unit
    const humChart = within(screen.getByTestId('humidity-chart')).getByTestId('line-chart');
    act(() => humChart.props.onDataPointClick({ index: 23, value: 0, x: 260, y: 40 }));
    expect(within(screen.getByTestId('humidity-chart-tooltip')).getByText(`${reading(5, 1).humidity}%`)).toBeTruthy();

    act(() => tempChart.props.onDataPointClick({ index: 2, value: 0, x: 80, y: 90 }));
    expect(screen.queryByTestId('temperature-chart-tooltip')).toBeNull();
  });
});

it('map home button zooms back out to all of Costa Rica', async () => {
  const MapView = require('react-native-maps').default;
  const fit = jest.spyOn(MapView.prototype, 'fitToCoordinates').mockImplementation(() => {});

  await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });
  fireEvent.press(screen.getByText('Map'));
  await screen.findByTestId('sensor-map');

  fireEvent.press(screen.getByTestId('map-home'));

  const { DEFAULT_BOUNDS } = require('@/components/SensorMap');
  expect(fit).toHaveBeenLastCalledWith(DEFAULT_BOUNDS, expect.objectContaining({ animated: true }));
});

describe('switching screens never stacks duplicate maps (memory leak)', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const SPOT = { latitude: 10.54, longitude: -83.5 };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // Screens behind the current one are hidden from queries by default -
  // exactly the ones that pile up, so count them too
  const mapCount = () => screen.queryAllByTestId('sensor-map', { includeHiddenElements: true }).length;

  it('Map <-> Config back and forth keeps a single map', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');

    for (let i = 0; i < 5; i++) {
      fireEvent.press(screen.getAllByText('Config').at(-1)!);
      await waitFor(() => expect(app.getPathname()).toBe('/config'));
      fireEvent.press(screen.getAllByText('Map').at(-1)!);
      await waitFor(() => expect(app.getPathname()).toBe('/map'));
    }

    expect(mapCount()).toBe(1);
    expect(screen.queryAllByText('Configure', { includeHiddenElements: true }).length).toBeLessThanOrEqual(1);
  });

  it('Map -> node reading -> Map loops keep a single map and a single node view', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');

    // Place node 5 so its reading can be tapped
    fireEvent(screen.getByTestId('sensor-map'), 'longPress', { nativeEvent: { coordinate: SPOT } });
    fireEvent.press(screen.getByTestId('place-node-5'));
    fireEvent.press(screen.getByText('✓ Place'));
    await waitFor(() => expect(screen.getByTestId('node-marker-5')).toBeTruthy());

    for (let i = 0; i < 5; i++) {
      fireEvent.press(screen.getAllByTestId('node-marker-5').at(-1)!, { stopPropagation: () => {}, nativeEvent: {} });
      fireEvent.press(screen.getAllByTestId('info-temperature').at(-1)!);
      await waitFor(() => expect(app.getPathname()).toBe('/node'));
      await finishNodeLoading(); // graphs drawn -> bottom bar usable
      fireEvent.press(screen.getAllByText('Map').at(-1)!);
      await waitFor(() => expect(app.getPathname()).toBe('/map'));
    }

    expect(mapCount()).toBe(1);
    expect(screen.queryAllByText('Temperature (last 24h)', { includeHiddenElements: true }).length).toBeLessThanOrEqual(1);
  });

  it('Dashboard -> Node -> Map -> Config -> Map still reaches every screen', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });

    fireEvent.press(screen.getByText('Node 5'));
    await waitFor(() => expect(app.getPathname()).toBe('/node'));
    await finishNodeLoading(); // graphs drawn -> bottom bar usable
    fireEvent.press(screen.getAllByText('Map').at(-1)!);
    await waitFor(() => expect(app.getPathname()).toBe('/map'));
    fireEvent.press(screen.getAllByText('Config').at(-1)!);
    await waitFor(() => expect(app.getPathname()).toBe('/config'));
    fireEvent.press(screen.getAllByText('Map').at(-1)!);
    await waitFor(() => expect(app.getPathname()).toBe('/map'));
    expect(mapCount()).toBe(1);

    fireEvent.press(screen.getAllByText('Dash').at(-1)!);
    await waitFor(() => expect(app.getPathname()).toBe('/dashboard'));
    expect(mapCount()).toBe(0);
  });
});

describe('Config: reset all map node locations', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const SPOT = { latitude: 10.54, longitude: -83.5 };
  const OTHER = { latitude: 9.9, longitude: -85.68 };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });


  const placeHubAndNode5 = async () => {
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    for (const [node, coordinate] of [[0, SPOT], [5, OTHER]] as const) {
      fireEvent(screen.getByTestId('sensor-map'), 'longPress', { nativeEvent: { coordinate } });
      fireEvent.press(screen.getByTestId(`place-node-${node}`));
      fireEvent.press(screen.getByText('✓ Place'));
      await waitFor(() => expect(screen.getByTestId(`node-marker-${node}`)).toBeTruthy());
    }
  };

  it('asks first, then removes every node and the hub - also from the map open underneath', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    await placeHubAndNode5();

    // Map stays open underneath Config
    fireEvent.press(screen.getAllByText('Config').at(-1)!);
    await screen.findByText('Configure');
    fireEvent.press(screen.getByTestId('reset-node-locations'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Reset all map node locations?',
      expect.any(String),
      expect.any(Array)
    );
    await answerAlert('Reset');

    await waitFor(async () => expect(await AsyncStorage.getItem('turtle_node_placements')).toBeNull());

    fireEvent.press(screen.getAllByText('Map').at(-1)!);
    await waitFor(() => expect(app.getPathname()).toBe('/map'));
    await waitFor(() =>
      expect(screen.queryAllByTestId(/^node-marker-/, { includeHiddenElements: true })).toHaveLength(0)
    );
  });

  it('Cancel keeps everything', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    await placeHubAndNode5();

    fireEvent.press(screen.getAllByText('Config').at(-1)!);
    await screen.findByText('Configure');
    fireEvent.press(screen.getByTestId('reset-node-locations'));
    await answerAlert('Cancel');

    expect(JSON.parse(await AsyncStorage.getItem('turtle_node_placements'))).toEqual({ 0: SPOT, 5: OTHER });
    fireEvent.press(screen.getAllByText('Map').at(-1)!);
    await waitFor(() => expect(screen.getByTestId('node-marker-0')).toBeTruthy());
    expect(screen.getByTestId('node-marker-5')).toBeTruthy();
  });

  it('is disabled when nothing is placed', async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Config'));
    await screen.findByText('Configure');

    fireEvent.press(screen.getByTestId('reset-node-locations'));
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('Config: Disconnect asks first', () => {
  it('Cancel stays connected on Config; Disconnect drops the hub', async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Config'));
    await screen.findByText('Configure');

    fireEvent.press(screen.getByTestId('disconnect'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Disconnect from the main controller?',
      expect.any(String),
      expect.any(Array)
    );
    await answerAlert('Cancel');
    expect(app.getPathname()).toBe('/config');
    expect(hub.connected).toBe(true);

    fireEvent.press(screen.getByTestId('disconnect'));
    await answerAlert('Disconnect');
    await waitFor(() => expect(app.getPathname()).toBe('/hub_connect'));
    expect(hub.connected).toBe(false);
  });
});

describe('Change Default Map Location', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const MapView = require('react-native-maps').default;
  const { DEFAULT_BOUNDS } = require('@/components/SensorMap');
  const BEACH_VIEW = { latitude: 10.54, longitude: -83.5, latitudeDelta: 0.3, longitudeDelta: 0.3 };
  const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 500 } } };

  let fit: jest.SpyInstance;
  let toRegion: jest.SpyInstance;
  let setCam: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    fit = jest.spyOn(MapView.prototype, 'fitToCoordinates').mockImplementation(() => {});
    toRegion = jest.spyOn(MapView.prototype, 'animateToRegion').mockImplementation(() => {});
    setCam = jest.spyOn(MapView.prototype, 'setCamera').mockImplementation(() => {});
    jest.spyOn(MapView.prototype, 'animateCamera').mockImplementation(() => {});
    // No native map in jest: views are saved by region
    jest.spyOn(MapView.prototype, 'getCamera').mockRejectedValue(new Error('no native map'));
  });

  // jest has no native map: report it ready and sized ourselves
  const readyTheMap = () => {
    fireEvent(screen.getAllByTestId('sensor-map-container').at(-1)!, 'layout', layout);
    fireEvent(screen.getAllByTestId('sensor-map').at(-1)!, 'mapReady');
  };

  const openPicker = async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Config'));
    await screen.findByText('Configure');
    fireEvent.press(screen.getByTestId('change-default-map-location'));
    await waitFor(() => expect(app.getPathname()).toBe('/pick-location'));
    readyTheMap();
    return app;
  };

  it('opens on Costa Rica when no default was chosen yet, with Cancel and Confirm', async () => {
    await openPicker();
    await waitFor(() => expect(fit).toHaveBeenCalledWith(DEFAULT_BOUNDS, expect.objectContaining({ animated: false })));
    expect(screen.getByText('✕ Cancel')).toBeTruthy();
    expect(screen.getByText('✓ Confirm')).toBeTruthy();
    expect(screen.queryByTestId('map-home')).toBeNull(); // no home button while picking
  });

  it('Confirm saves the framed view; the map home button then goes there', async () => {
    const app = await openPicker();
    await waitFor(() => expect(fit).toHaveBeenCalled());

    fireEvent(screen.getByTestId('sensor-map'), 'regionChangeComplete', BEACH_VIEW);
    fireEvent.press(screen.getByText('✓ Confirm'));

    await waitFor(() => expect(app.getPathname()).toBe('/config'));
    expect(JSON.parse(await AsyncStorage.getItem('turtle_default_map_view'))).toEqual({ region: BEACH_VIEW });

    fireEvent.press(screen.getAllByText('Map').at(-1)!);
    await screen.findByTestId('map-home');
    toRegion.mockClear();
    fireEvent.press(screen.getByTestId('map-home'));
    expect(toRegion).toHaveBeenCalledWith(BEACH_VIEW, 500);
  });

  it('Cancel leaves the default unchanged', async () => {
    const app = await openPicker();
    await waitFor(() => expect(fit).toHaveBeenCalled());

    fireEvent(screen.getByTestId('sensor-map'), 'regionChangeComplete', BEACH_VIEW);
    fireEvent.press(screen.getByText('✕ Cancel'));

    await waitFor(() => expect(app.getPathname()).toBe('/config'));
    expect(await AsyncStorage.getItem('turtle_default_map_view')).toBeNull();
  });

  it('reopening the picker starts on the previously chosen default', async () => {
    const camera = { center: { latitude: 9.9, longitude: -85.7 }, zoom: 13, heading: 0, pitch: 0 };
    await AsyncStorage.setItem('turtle_default_map_view', JSON.stringify({ camera, region: BEACH_VIEW }));

    await openPicker();
    await waitFor(() => expect(setCam).toHaveBeenCalledWith(camera));
    expect(fit).not.toHaveBeenCalled();
  });

  it('a map that was never opened before starts on the chosen default', async () => {
    await AsyncStorage.setItem('turtle_default_map_view', JSON.stringify({ region: BEACH_VIEW }));

    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    readyTheMap();

    await waitFor(() => expect(toRegion).toHaveBeenCalledWith(BEACH_VIEW, 0));
    expect(fit).not.toHaveBeenCalled();
  });
});

describe('map: Map / Satellite toggle', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const openMap = async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
  };
  const shownType = () => screen.getByTestId('sensor-map').props.mapType;

  it('sits next to the home button and switches between plain map and satellite', async () => {
    await openMap();
    expect(screen.getByTestId('map-type-standard')).toBeTruthy();
    expect(screen.getByTestId('map-type-hybrid')).toBeTruthy();
    expect(screen.getByTestId('map-home')).toBeTruthy();
    expect(shownType()).toBe('hybrid'); // satellite until changed

    fireEvent.press(screen.getByTestId('map-type-standard'));
    expect(shownType()).toBe('standard');
    expect(screen.getByTestId('map-type-standard').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByTestId('map-type-hybrid'));
    expect(shownType()).toBe('hybrid');
  });

  it('remembers the choice the next time the map opens', async () => {
    await openMap();
    fireEvent.press(screen.getByTestId('map-type-standard'));
    await waitFor(async () => expect(await AsyncStorage.getItem('turtle_map_type')).toBe('standard'));

    // Leave the map (closes it) and come back
    fireEvent.press(screen.getAllByText('Dash').at(-1)!);
    await screen.findByText('Sync');
    fireEvent.press(screen.getByText('Map'));
    await screen.findByTestId('sensor-map');
    await waitFor(() => expect(shownType()).toBe('standard'));
  });
});

it('map controls: Map/Satellite left and Home right; picker keeps Map/Satellite left', async () => {
  const { StyleSheet: SS } = require('react-native');
  await loginAndConnect();
  await screen.findByText('Node 12', {}, { timeout: 5000 });
  fireEvent.press(screen.getByText('Map'));
  await screen.findByTestId('sensor-map');

  // One full-width row, spaced between: toggle group left, home right
  const row = screen.getByTestId('map-controls');
  expect(SS.flatten(row.props.style)).toMatchObject({ left: 12, right: 12, justifyContent: 'space-between' });
  expect(within(row).getByTestId('map-type-toggle')).toBeTruthy();
  expect(within(row).getByTestId('map-home')).toBeTruthy();

  // Picker: no home button, so the toggle group sits alone on the left
  fireEvent.press(screen.getAllByText('Config').at(-1)!);
  await screen.findByText('Configure');
  fireEvent.press(screen.getByTestId('change-default-map-location'));
  await screen.findByText('Default Map Location');
  const pickerRow = screen.getAllByTestId('map-controls').at(-1)!;
  expect(within(pickerRow).getByTestId('map-type-toggle')).toBeTruthy();
  expect(within(pickerRow).queryByTestId('map-home')).toBeNull();
});

describe('light / dark theme', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const { StyleSheet: SS } = require('react-native');
  const { PALETTES } = require('@/context/ThemeContext');
  const textColor = (text: string) => SS.flatten(screen.getAllByText(text).at(-1)!.props.style)?.color;

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const openConfig = async () => {
    await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Config'));
    await screen.findByText('Configure');
  };

  it('is dark by default', async () => {
    await openConfig();
    expect(screen.getByTestId('dark-theme-switch').props.value).toBe(true);
    expect(textColor('Configure')).toBe(PALETTES.dark.text);
  });

  it('switching to light recolours the app, is saved, and the switch stays off after leaving Config', async () => {
    await openConfig();
    fireEvent(screen.getByTestId('dark-theme-switch'), 'valueChange', false);

    await waitFor(() => expect(textColor('Configure')).toBe(PALETTES.light.text));
    expect(await AsyncStorage.getItem('turtle_theme')).toBe('light');

    // Other screens follow too
    fireEvent.press(screen.getAllByText('Dash').at(-1)!);
    await screen.findByText('Sync');
    expect(textColor('Dashboard')).toBe(PALETTES.light.text);

    // Back to Config: the switch kept its position (it used to reset)
    fireEvent.press(screen.getAllByText('Config').at(-1)!);
    await screen.findByText('Configure');
    expect(screen.getAllByTestId('dark-theme-switch').at(-1)!.props.value).toBe(false);
  });

  it('the saved theme is applied when the app starts', async () => {
    await AsyncStorage.setItem('turtle_theme', 'light');
    renderRouter(APP_DIR, { initialUrl: '/' });
    await screen.findByText('Welcome!', {}, { timeout: 3000 });
    await waitFor(() => expect(textColor('Welcome!')).toBe(PALETTES.light.text));
  });
});

describe('login screen', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const { StyleSheet: SS } = require('react-native');
  const { PALETTES } = require('@/context/ThemeContext');

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const openLogin = async () => {
    renderRouter(APP_DIR, { initialUrl: '/' });
    await screen.findByText('Welcome!', {}, { timeout: 3000 });
  };

  // jest has no layout: report the space between the fields and preferences
  const sizeLogoSpace = (width: number, height: number) =>
    fireEvent(screen.getByTestId('login-logo-space'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height } },
    });

  it('says Welcome! with the logo behind the form', async () => {
    await openLogin();
    expect(screen.queryByText('Habitat Login')).toBeNull();
    sizeLogoSpace(300, 260);
    expect(screen.getByTestId('logo')).toBeTruthy();
    // The form still works through the watermark
    fireEvent.changeText(screen.getByPlaceholderText('Enter Username'), 'dev');
    fireEvent.changeText(screen.getByPlaceholderText('Enter Password'), '123');
    fireEvent.press(screen.getByText('Login'));
    await screen.findByText('Connect to Hub');
  });

  it('Dark Theme switch on the login screen changes and saves the app theme', async () => {
    await openLogin();
    const toggle = screen.getByTestId('login-dark-theme-switch');
    expect(toggle.props.value).toBe(true);

    fireEvent(toggle, 'valueChange', false);
    await waitFor(() =>
      expect(SS.flatten(screen.getByText('Welcome!').props.style).color).toBe(PALETTES.light.text)
    );
    expect(await AsyncStorage.getItem('turtle_theme')).toBe('light');
  });

  it('only the fields, logo and preferences scroll; Welcome! and the login bar stay fixed', async () => {
    await openLogin();
    const scroll = screen.getByTestId('login-scroll');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');

    // Inside the scroll view
    expect(within(scroll).getByPlaceholderText('Enter Username')).toBeTruthy();
    expect(within(scroll).getByPlaceholderText('Enter Password')).toBeTruthy();
    sizeLogoSpace(300, 260);
    expect(within(scroll).getByTestId('logo')).toBeTruthy();
    expect(within(scroll).getByText('Dark Theme')).toBeTruthy();

    // Outside it: the header stays at the top, the login bar rides up with
    // the keyboard
    expect(within(scroll).queryByText('Welcome!')).toBeNull();
    expect(within(scroll).queryByText('Login')).toBeNull();
    expect(within(screen.getByTestId('login-bar')).getByText('Login')).toBeTruthy();
  });

  it('logo fills the space between the fields and the preferences, faded, with a small gap', async () => {
    await openLogin();
    const { LOGO_ASPECT } = require('@/components/Logo');
    const logoSize = () => {
      const svg = screen.getByTestId('logo');
      // react-native-svg moves opacity into the style
      const opacity = svg.props.opacity ?? SS.flatten(svg.props.style)?.opacity;
      return { width: svg.props.width, height: svg.props.height, opacity };
    };

    // Tall space: limited by height, 8px gap above and below
    sizeLogoSpace(300, 260);
    expect(logoSize().height).toBeCloseTo(260 - 16, 5);
    expect(logoSize().width).toBeCloseTo((260 - 16) * LOGO_ASPECT, 5);
    expect(logoSize().opacity).toBe(0.12); // dark theme

    // Opening the keyboard shrinks the space - the logo keeps its size
    // (the middle scrolls instead)
    sizeLogoSpace(300, 120);
    expect(logoSize().height).toBeCloseTo(244, 5);
  });

  it('logo is limited by width when the space is wide and short', async () => {
    await openLogin();
    const { LOGO_ASPECT } = require('@/components/Logo');
    sizeLogoSpace(200, 400);
    const svg = screen.getByTestId('logo');
    expect(svg.props.width).toBe(200);
    expect(svg.props.height).toBeCloseTo(200 / LOGO_ASPECT, 5);
  });

  it('has no language buttons for now', async () => {
    await openLogin();
    expect(screen.queryByText('English')).toBeNull();
    expect(screen.queryByText('Spanish')).toBeNull();
    expect(screen.getByText('Dark Theme')).toBeTruthy();
  });
});

describe('node view: Fetching Node X while the graphs draw', () => {
  const openNode5 = async () => {
    const app = await loginAndConnect();
    await screen.findByText('Node 12', {}, { timeout: 5000 });
    fireEvent.press(screen.getByText('Node 5'));
    await waitFor(() => expect(app.getPathname()).toBe('/node'));
    return app;
  };
  const drawChart = (testID: string) =>
    fireEvent(screen.getByTestId(testID), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 180 } },
    });
  const contentOpacity = () => {
    const { StyleSheet: SS } = require('react-native');
    return SS.flatten(screen.getByTestId('node-content').props.style)?.opacity;
  };

  it('opens straight to a spinner, then reveals the screen once both graphs have drawn', async () => {
    await openNode5();
    expect(screen.getByTestId('node-loading')).toBeTruthy();
    expect(screen.getByText('Fetching Node 5')).toBeTruthy();
    // The loading screen covers the bottom bar too: hidden and untappable
    const navStyle = () => {
      const { StyleSheet: SS } = require('react-native');
      const nav = screen.getByTestId('node-nav');
      return { opacity: SS.flatten(nav.props.style)?.opacity, pointerEvents: nav.props.pointerEvents ?? SS.flatten(nav.props.style)?.pointerEvents };
    };
    expect(navStyle()).toEqual({ opacity: 0, pointerEvents: 'none' });

    // Content is built behind the spinner, hidden
    await screen.findByTestId('node-content');
    expect(contentOpacity()).toBe(0);

    drawChart('temperature-chart');
    expect(screen.getByText('Fetching Node 5')).toBeTruthy(); // still one to go
    drawChart('humidity-chart');

    await waitFor(() => expect(screen.queryByTestId('node-loading')).toBeNull());
    expect(contentOpacity()).toBe(1);
    expect(navStyle()).toEqual({ opacity: 1, pointerEvents: 'auto' });
  });

  it('never spins forever: shows the screen after the fallback even if a graph does not report', async () => {
    // Short fallback: the animated spinner makes fake-timer runs of 3 s stall
    const { NODE_LOADING } = require('@/app/node');
    const original = NODE_LOADING.fallbackMs;
    NODE_LOADING.fallbackMs = 200;
    try {
    await openNode5();
    await screen.findByTestId('node-content');
    expect(screen.getByText('Fetching Node 5')).toBeTruthy();

    await waitFor(() => expect(screen.queryByTestId('node-loading')).toBeNull(), { timeout: 5000 });
    expect(contentOpacity()).toBe(1);
    } finally {
      NODE_LOADING.fallbackMs = original;
    }
  });
});
