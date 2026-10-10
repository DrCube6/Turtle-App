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
