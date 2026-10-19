import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { BLEProvider, useBLE } from '@/context/BLEContext';
import { hub, makeDevice } from '@/test/fakeHub';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BLEProvider>{children}</BLEProvider>
);

async function connectedBLE() {
  const view = renderHook(() => useBLE(), { wrapper });
  await act(async () => {
    await view.result.current.connectToDevice(makeDevice());
  });
  expect(view.result.current.connectedDevice).not.toBeNull();
  return view;
}

beforeEach(() => {
  hub.reset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('downloads and parses the full 24h sensor CSV from the hub', async () => {
  const { result } = await connectedBLE();

  await act(async () => {
    await result.current.requestCSV();
  });

  await waitFor(() => expect(result.current.isTransferring).toBe(false));
  expect(result.current.csvType).toBe('sensor');
  expect(result.current.sensorData).toHaveLength(24 * 13);
  expect(hub.controlLog).toEqual(['START']);
});

it('recovers dropped chunks by sending RETRY for exactly those indices', async () => {
  hub.dropOnce = new Set([0, 3, 7]);
  const { result } = await connectedBLE();

  await act(async () => {
    await result.current.requestCSV();
  });

  await waitFor(() => expect(result.current.isTransferring).toBe(false), {
    timeout: 5000,
  });
  expect(hub.controlLog).toEqual(['START', 'RETRY:0,3,7']);
  expect(result.current.sensorData).toHaveLength(24 * 13);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('flags an unconfigured hub as config and clears sensor data', async () => {
  hub.mode = 'config';
  const { result } = await connectedBLE();

  await act(async () => {
    await result.current.requestCSV();
  });

  await waitFor(() => expect(result.current.csvType).toBe('config'));
  expect(result.current.sensorData).toEqual([]);
});

it('writes the config CSV to the hub and clears the config flag', async () => {
  hub.mode = 'config';
  const { result } = await connectedBLE();
  await act(async () => {
    await result.current.requestCSV();
  });
  await waitFor(() => expect(result.current.csvType).toBe('config'));

  let ok = false;
  await act(async () => {
    ok = await result.current.writeConfig({
      userId: 'turtle',
      userPassword: 'shell',
      wifiSsid: 'Beach',
      wifiPass: 'sand',
      authKey: 'KEY123',
      sampleRate: '30',
    });
  });

  expect(ok).toBe(true);
  expect(hub.receivedConfigCsv).toContain('WIFI SSID,Beach');
  expect(hub.receivedConfigCsv).toContain('AUTH KEY (From Login),KEY123');
  expect(hub.controlLog.at(-1)).toBe('WRITE_DONE');
  // Regression: a stale 'config' here bounced the dashboard back to /init
  expect(result.current.csvType).toBeNull();
});

it('gives up cleanly when the hub never answers, without faking a config CSV', async () => {
  jest.useFakeTimers();
  hub.mode = 'silent';
  const { result } = await connectedBLE();

  await act(async () => {
    await result.current.requestCSV();
  });

  // 1 START + 5 resends, 1.5s watchdog each
  for (let i = 0; i < 7; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
  }

  expect(result.current.isTransferring).toBe(false);
  expect(hub.controlLog).toEqual(Array(6).fill('START'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Transfer failed',
    'No data received from the hub.'
  );
  // Regression: this used to become 'config' and redirect to setup
  expect(result.current.csvType).toBeNull();
});

it('disconnect resets all connection state', async () => {
  const { result } = await connectedBLE();
  await act(async () => {
    await result.current.requestCSV();
  });
  await waitFor(() => expect(result.current.sensorData.length).toBeGreaterThan(0));

  await act(async () => {
    await result.current.disconnect();
  });

  expect(hub.connected).toBe(false);
  expect(result.current.connectedDevice).toBeNull();
  expect(result.current.sensorData).toEqual([]);
  expect(result.current.csvType).toBeNull();
});

describe('real firmware files over the chunked transfer', () => {
  const fs = require('fs');
  const path = require('path');
  const fixture = (name: string): string =>
    fs.readFileSync(path.join(__dirname, '../test/fixtures', name), 'utf8')
      .replace(/\r?\n/g, '\r\n'); // firmware line endings (~6.5 kB for data.csv)

  it('data.csv arrives as sensor data with all 312 rows', async () => {
    hub.sensorCsv = fixture('data.csv');
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.requestCSV();
    });

    await waitFor(() => expect(result.current.isTransferring).toBe(false));
    expect(result.current.csvType).toBe('sensor');
    expect(result.current.sensorData).toHaveLength(312);
    expect(result.current.receivedData.length).toBeGreaterThan(6400);
  });

  it('init.csv arrives as config', async () => {
    hub.mode = 'config';
    hub.configCsv = fixture('init.csv');
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.requestCSV();
    });

    await waitFor(() => expect(result.current.csvType).toBe('config'));
    expect(result.current.sensorData).toEqual([]);
  });

  it('an unrecognised file alerts and keeps existing data instead of redirecting to setup', async () => {
    hub.sensorCsv = fixture('data.csv');
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.requestCSV();
    });
    await waitFor(() => expect(result.current.sensorData).toHaveLength(312));

    hub.sensorCsv = 'Some,Other,File\n1,2,3';
    await act(async () => {
      await result.current.requestCSV();
    });

    await waitFor(() => expect(result.current.isTransferring).toBe(false));
    expect(result.current.csvType).toBeNull();
    expect(result.current.sensorData).toHaveLength(312);
    expect(Alert.alert).toHaveBeenCalledWith('Unrecognised data', expect.any(String));
  });
});

describe('waiting for the hub to verify a config write', () => {
  const { CONFIG_RESULT_TIMING } = require('@/context/BLEContext');
  const original = { ...CONFIG_RESULT_TIMING };
  const fields = {
    userId: 'turtle',
    userPassword: 'shell',
    wifiSsid: 'Beach',
    wifiPass: 'sand',
    authKey: 'KEY123',
    sampleRate: '30',
  };

  beforeEach(() => {
    Object.assign(CONFIG_RESULT_TIMING, { settleMs: 50, pollIntervalMs: 50, timeoutMs: 20000 });
  });
  afterEach(() => {
    Object.assign(CONFIG_RESULT_TIMING, original);
  });

  async function writeThenWait(result: { current: ReturnType<typeof useBLE> }) {
    let verdict: string | undefined;
    await act(async () => {
      expect(await result.current.writeConfig(fields)).toBe(true);
    });
    await act(async () => {
      verdict = await result.current.waitForConfigResult();
    });
    return verdict;
  }

  it('accepted: hub validates (silent for a moment) then sends data.csv', async () => {
    hub.mode = 'config';
    hub.validationMs = 500;
    const { result } = await connectedBLE();

    expect(await writeThenWait(result)).toBe('accepted');
    expect(result.current.csvType).toBe('sensor');
    expect(result.current.sensorData).toHaveLength(312);
    expect(result.current.isAwaitingConfigResult).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled(); // polling is quiet
  });

  it('rejected: hub sends a blank init.csv asking for correct info', async () => {
    hub.mode = 'config';
    hub.validationMs = 300;
    hub.acceptConfig = () => false;
    const { result } = await connectedBLE();

    expect(await writeThenWait(result)).toBe('rejected');
    expect(result.current.csvType).toBe('config');
    expect(result.current.sensorData).toEqual([]);
  });

  it('ignores the old blank init.csv the hub still advertises right after the write', async () => {
    // Hub keeps serving the old init.csv while validating; the settle delay
    // must outlast that or the old file would read as a rejection
    Object.assign(CONFIG_RESULT_TIMING, { settleMs: 400 });
    hub.mode = 'config';
    hub.busyMode = 'config';
    hub.validationMs = 150;
    const { result } = await connectedBLE();

    expect(await writeThenWait(result)).toBe('accepted');
  });

  it('times out if the hub never gives a verdict', async () => {
    jest.useFakeTimers();
    Object.assign(CONFIG_RESULT_TIMING, { timeoutMs: 30000 });
    hub.mode = 'config';
    hub.validationMs = 10 * 60 * 1000; // stays silent
    const { result } = await connectedBLE();

    await act(async () => {
      await result.current.writeConfig(fields);
    });

    let verdict: string | undefined;
    const waiting = result.current.waitForConfigResult().then(v => (verdict = v));
    for (let i = 0; i < 40 && verdict === undefined; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });
    }
    await waiting;

    expect(verdict).toBe('timeout');
    expect(result.current.isAwaitingConfigResult).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('disconnect cancels the wait', async () => {
    hub.mode = 'config';
    hub.validationMs = 10 * 60 * 1000;
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.writeConfig(fields);
    });

    let verdict: string | undefined;
    const waiting = result.current.waitForConfigResult().then(v => (verdict = v));
    await waitFor(() => expect(hub.controlLog.at(-1)).toBe('START'));
    await act(async () => {
      await result.current.disconnect();
    });
    await act(async () => {
      await waiting;
    });

    expect(verdict).toBe('cancelled');
  });
});

describe('connecting (Android first attempts often fail)', () => {
  it('retries and connects when the first two attempts fail with "was disconnected"', async () => {
    hub.failConnects = 2;
    const { result } = renderHook(() => useBLE(), { wrapper });

    let device: any;
    await act(async () => {
      device = await result.current.connectToDevice(makeDevice());
    });

    expect(device).not.toBeNull();
    expect(hub.connectAttempts).toBe(3);
    expect(result.current.connectedDevice).not.toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('gives up after 3 failed attempts with one clear alert', async () => {
    hub.failConnects = 99;
    const { result } = renderHook(() => useBLE(), { wrapper });

    let device: any = 'unset';
    await act(async () => {
      device = await result.current.connectToDevice(makeDevice());
    });

    expect(device).toBeNull();
    expect(hub.connectAttempts).toBe(3);
    expect(result.current.connectedDevice).toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith('Connection Failed', expect.stringContaining('Tried 3 times'));
  });

  it('stops a running scan before connecting', async () => {
    const { result } = renderHook(() => useBLE(), { wrapper });
    await act(async () => {
      await result.current.startScan();
    });
    expect(hub.scanning).toBe(true);

    await act(async () => {
      await result.current.connectToDevice(makeDevice());
    });

    expect(hub.connectedWhileScanning).toBe(false);
    expect(result.current.isScanning).toBe(false);
  });

  it('ignores a second tap while already connecting', async () => {
    hub.failConnects = 1;
    const { result } = renderHook(() => useBLE(), { wrapper });

    let second: any = 'unset';
    await act(async () => {
      const first = result.current.connectToDevice(makeDevice());
      second = await result.current.connectToDevice(makeDevice());
      await first;
    });

    expect(second).toBeNull();
    expect(hub.connectAttempts).toBe(2); // 1 failure + 1 success, no extra
  });
});

it('reports chunk progress during a transfer', async () => {
  hub.dropOnce = new Set([20]); // holds the transfer open until the retry
  const { result } = await connectedBLE();

  await act(async () => {
    await result.current.requestCSV();
  });

  const total = hub.chunks.length;
  await waitFor(() => expect(result.current.transferProgress).toEqual({ received: total - 1, total }));
  expect(result.current.isTransferring).toBe(true);

  await waitFor(() => expect(result.current.transferProgress).toEqual({ received: total, total }), { timeout: 5000 });
  await waitFor(() => expect(result.current.isTransferring).toBe(false));
});

describe('the hub dropping the connection', () => {
  it('flags connectionLost and clears the connection and data', async () => {
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.requestCSV();
    });
    await waitFor(() => expect(result.current.sensorData.length).toBeGreaterThan(0));
    expect(result.current.lastSyncedAt).not.toBeNull();

    act(() => hub.dropConnection());

    expect(result.current.connectionLost).toBe(true);
    expect(result.current.connectedDevice).toBeNull();
    expect(result.current.sensorData).toEqual([]);
    expect(result.current.lastSyncedAt).toBeNull();
  });

  it('a transfer in progress resolves as "disconnected" without a failure alert', async () => {
    hub.mode = 'silent';
    const { result } = await connectedBLE();

    let transfer: Promise<string> | undefined;
    act(() => {
      transfer = result.current.requestCSVAndWait({ quiet: false });
    });
    act(() => hub.dropConnection());

    await expect(transfer).resolves.toBe('disconnected');
    expect(result.current.isTransferring).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('a deliberate disconnect is not reported as lost', async () => {
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.connectionLost).toBe(false);
    expect(hub.disconnectListeners.size).toBe(0);
  });

  it('the next scan clears the lost flag', async () => {
    const { result } = await connectedBLE();
    act(() => hub.dropConnection());
    expect(result.current.connectionLost).toBe(true);

    await act(async () => {
      await result.current.startScan();
    });
    expect(result.current.connectionLost).toBe(false);
  });

  it('records when the last sync finished', async () => {
    const { result } = await connectedBLE();
    const before = Date.now();
    await act(async () => {
      await result.current.requestCSV();
    });
    await waitFor(() => expect(result.current.lastSyncedAt).not.toBeNull());
    expect(result.current.lastSyncedAt!).toBeGreaterThanOrEqual(before);
  });
});

describe('iOS readiness', () => {
  it('scan waits for Bluetooth to finish starting up (iOS reports Unknown at first)', async () => {
    hub.bluetoothState = 'Unknown';
    const { result } = renderHook(() => useBLE(), { wrapper });

    let scanning!: Promise<void>;
    act(() => {
      scanning = result.current.startScan();
    });
    // Bluetooth comes up a moment later
    await act(async () => {
      hub.setBluetoothState('PoweredOn');
      await scanning;
    });

    expect(result.current.isScanning).toBe(true);
    await waitFor(() => expect(result.current.devices).toHaveLength(1));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it.each([
    ['PoweredOff', 'Bluetooth Is Off'],
    ['Unauthorized', 'Bluetooth Not Allowed'],
  ])('Bluetooth %s: explains instead of scanning', async (state, title) => {
    hub.bluetoothState = state;
    const { result } = renderHook(() => useBLE(), { wrapper });

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.isScanning).toBe(false);
    expect(hub.scanning).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(title, expect.any(String));
  });

  // iPhones usually allow 182 bytes per BLE message (MTU 185 - 3)
  const IOS_MAX_PACKET = 182;

  it('config writes fit an iPhone BLE packet', async () => {
    hub.mode = 'config';
    const { result } = await connectedBLE();
    await act(async () => {
      await result.current.writeConfig({
        userId: 'a-fairly-long-cloud-user-name@university.example.edu',
        userPassword: 'x'.repeat(60),
        wifiSsid: 'University Trails Guest Network 5GHz',
        wifiPass: 'y'.repeat(60),
        authKey: 'SiNGzYAVbOHB2rWemXy6dUL7gpZJasjt',
        sampleRate: '30',
      });
    });

    expect(hub.configPacketSizes.length).toBeGreaterThan(1); // really chunked
    expect(Math.max(...hub.configPacketSizes)).toBeLessThanOrEqual(IOS_MAX_PACKET);
  });

  it('the hub notifications (firmware chunk size) fit an iPhone BLE packet', () => {
    const sizes = hub.chunks.map((c) => c.length);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(IOS_MAX_PACKET);
  });
});
