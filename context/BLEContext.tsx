import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  BleManager,
  BleErrorCode,
  Device,
} from 'react-native-ble-plx';

import {
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';

import { Buffer } from 'buffer';

import {
  buildConfigCSV,
  detectCSVType,
  parseCSV,
  type ConfigFields,
  type CSVType,
  type SensorData,
} from '@/utils/csv';

export type { ConfigFields, SensorData } from '@/utils/csv';

// UUIDs for the ESP32 service and characteristics
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const TX_UUID = '87654321-4321-4321-4321-cba987654321';
const CONTROL_UUID = '11223344-1122-1122-1122-112233445566';
// Dedicated characteristic for phone -> ESP32 config writes. Kept separate
// from CONTROL_UUID (plain ASCII commands) so binary chunk bytes never risk
// being misread as a command string.
const CONFIG_WRITE_UUID = '99887766-9988-9988-9988-998877665544';

const bleManager = new BleManager();

const MAX_RETRY_ROUNDS = 5;
const WATCHDOG_MS = 1500;
// Same payload size used for the read path, kept conservative for MTU safety
const WRITE_CHUNK_PAYLOAD = 180;

// After the app writes init.csv, the hub validates it and then advertises
// either data.csv (accepted) or a blank init.csv (rejected). These control how
// the app waits for that verdict. Mutable so tests can shorten them.
export const CONFIG_RESULT_TIMING = {
  // Give the hub time to process WRITE_DONE before asking, so we don't read
  // back the old blank init.csv it was advertising before the write
  settleMs: 3000,
  // Pause between attempts while the hub isn't answering yet
  pollIntervalMs: 2000,
  // Give up after this long with no data.csv / init.csv
  timeoutMs: 90000,
};

// Connecting: Android's first attempt often fails transiently, so retry
const CONNECT_ATTEMPTS = 3;
const CONNECT_RETRY_DELAY_MS = 600; // x attempt number
const CONNECT_TIMEOUT_MS = 10000;

// Outcome of one CSV transfer
// 'disconnected' = the hub dropped the connection mid-transfer
export type TransferResult = 'sensor' | 'config' | 'unrecognised' | 'failed' | 'disconnected';

// Outcome of waiting for the hub's verdict on a config write
export type ConfigResult = 'accepted' | 'rejected' | 'timeout' | 'cancelled';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type BLEContextType = {
  devices: Device[];
  connectedDevice: Device | null;
  isScanning: boolean;
  isConnecting: boolean;
  receivedData: string;
  sensorData: SensorData[];
  isMonitoring: boolean;
  isTransferring: boolean;
  transferProgress: { received: number; total: number };
  lastSyncedAt: number | null;
  connectionLost: boolean;
  isWritingConfig: boolean;
  isAwaitingConfigResult: boolean;
  csvType: CSVType;

  startScan: () => Promise<void>;
  clearScan: () => void;
  connectToDevice: (device: Device) => Promise<Device | null>;
  startMonitoring: (
    serviceUUID: string,
    characteristicUUID: string
  ) => Promise<void>;
  stopMonitoring: () => void;
  disconnect: () => Promise<void>;
  requestCSV: (options?: { quiet?: boolean }) => Promise<void>;
  requestCSVAndWait: (options?: { quiet?: boolean }) => Promise<TransferResult>;
  writeConfig: (fields: ConfigFields) => Promise<boolean>;
  waitForConfigResult: () => Promise<ConfigResult>;
  requestPermissions: () => Promise<boolean>;
};

const BLEContext = createContext<BLEContextType | undefined>(undefined);

export function BLEProvider({ children }: { children: React.ReactNode }) {

  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] =
    useState<Device | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [receivedData, setReceivedData] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);

  const subscriptionRef = useRef<any>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);
  // Listener for the hub dropping the connection on its own
  const disconnectSubRef = useRef<{ remove: () => void } | null>(null);
  // True after the hub disconnected unexpectedly, until the next scan/connect
  const [connectionLost, setConnectionLost] = useState(false);
  // When the last sensor-data sync finished (ms since epoch)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [sensorData, setSensorData] = useState<SensorData[]>([]);

  // -------------------------
  // Chunked CSV transfer state
  // -------------------------

  const chunksRef = useRef<Map<number, Uint8Array>>(new Map());
  const expectedTotalRef = useRef<number>(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const dataSubRef = useRef<any>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  // Chunks received so far in the current transfer (total 0 = not known yet)
  const [transferProgress, setTransferProgress] = useState({ received: 0, total: 0 });
  const [csvType, setCsvType] = useState<CSVType>(null);
  const [isWritingConfig, setIsWritingConfig] = useState(false);
  const [isAwaitingConfigResult, setIsAwaitingConfigResult] = useState(false);

  // Resolves whoever is awaiting the current transfer (requestCSVAndWait)
  const transferDoneRef = useRef<((result: TransferResult) => void) | null>(null);
  // Quiet transfers (background polling) don't pop up failure alerts
  const quietRef = useRef(false);
  // Set by disconnect() to stop waitForConfigResult's polling loop
  const configWaitCancelledRef = useRef(false);

  const settleTransfer = (result: TransferResult) => {
    const resolve = transferDoneRef.current;
    transferDoneRef.current = null;
    resolve?.(result);
  };

  // -------------------------
  // Permissions
  // -------------------------

  const requestPermissions = async (): Promise<boolean> => {

    if (Platform.OS === 'ios') {
      return true;
    }

    try {

      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every(
        status =>
          status === PermissionsAndroid.RESULTS.GRANTED
      );

    } catch (err) {

      console.error(err);
      return false;

    }
  };

  // -------------------------
  // Scan
  // -------------------------

  const startScan = async () => {

    const hasPermission = await requestPermissions();

    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Bluetooth permissions are required'
      );
      return;
    }

    setConnectionLost(false);
    setIsScanning(true);
    setDevices([]);

    bleManager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error, device) => {

        if (error) {
          console.error(error);
          setIsScanning(false);
          return;
        }

        if (device && device.name) {

          setDevices(prev => {

            if (prev.find(d => d.id === device.id)) {
              return prev;
            }

            return [...prev, device];
          });
        }
      }
    );

    // Track the auto-stop timer so clearScan (or a newer scan) can cancel
    // it - otherwise an old timer could cut a later scan short
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }

    scanTimerRef.current = setTimeout(() => {

      scanTimerRef.current = null;
      bleManager.stopDeviceScan();
      setIsScanning(false);

    }, 12000);
  };

  // Stop any running scan and forget the discovered devices, so a stale
  // list isn't shown the next time the hub screen opens
  const clearScan = () => {

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    bleManager.stopDeviceScan();
    setIsScanning(false);
    setDevices([]);
  };

  // -------------------------
  // Connect
  // -------------------------

  // One connection attempt: connect, bump the MTU, discover services
  const connectOnce = async (device: Device): Promise<Device> => {

    let connected = await device.connect({ timeout: CONNECT_TIMEOUT_MS });

    // Request the largest MTU we can - falls back gracefully if it fails
    // (iOS ignores this and negotiates its own value automatically)
    try {
      connected = await connected.requestMTU(517);
      console.log('MTU negotiated:', connected.mtu);
    } catch (mtuError) {
      console.log('MTU negotiation failed, continuing with default:', mtuError);
    }

    await connected.discoverAllServicesAndCharacteristics();

    return connected;
  };

  const connectToDevice = async (
    device: Device
  ): Promise<Device | null> => {

    // Ignore extra taps while an attempt (and its retries) is running
    if (isConnectingRef.current) {
      console.log('Already connecting, ignoring');
      return null;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);

    // Android often aborts a connection while a scan is still running, so
    // stop it first. The device list stays as it is.
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    bleManager.stopDeviceScan();
    setIsScanning(false);

    try {

      for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {

        try {

          console.log(`Connecting to: ${device.id} (attempt ${attempt}/${CONNECT_ATTEMPTS})`);

          const connected = await connectOnce(device);

          console.log('Connected:', connected.name);

          // Find out if the hub drops the connection on its own later
          disconnectSubRef.current = connected.onDisconnected(() => {
            handleConnectionLost();
          });

          setConnectionLost(false);
          setConnectedDevice(connected);

          return connected;

        } catch (error: any) {

          // Android's first attempt often fails with a transient GATT error
          // (GATT 133, reported as "Device ... was disconnected") - retry
          console.log(`Connect attempt ${attempt} failed:`, error?.message ?? error);

          if (attempt === CONNECT_ATTEMPTS) {
            throw error;
          }

          // Clear any half-open connection before trying again
          await bleManager.cancelDeviceConnection(device.id).catch(() => {});
          await sleep(CONNECT_RETRY_DELAY_MS * attempt);
        }
      }

      return null;

    } catch (error: any) {

      console.error(error);

      Alert.alert(
        'Connection Failed',
        `${error?.message ?? 'Could not connect'}\n\nTried ${CONNECT_ATTEMPTS} times. Make sure the hub is powered on and nearby, then try again.`
      );

      return null;

    } finally {

      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  };

  // -------------------------
  // Monitoring
  // -------------------------

  const startMonitoring = async (
    serviceUUID: string,
    characteristicUUID: string
  ) => {

    console.log('Starting monitoring');

    if (!connectedDevice) {

      console.log('No device connected');

      return;
    }

    try {

      // Prevent duplicate subscriptions
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      subscriptionRef.current =
        connectedDevice.monitorCharacteristicForService(
          serviceUUID,
          characteristicUUID,
          (error, characteristic) => {

            if (error) {
              console.error('Monitor error:', error);
              return;
            }

            if (characteristic?.value) {

              const decoded =
                Buffer.from(
                  characteristic.value,
                  'base64'
                ).toString('utf8');

              console.log('Received:', decoded);

              setReceivedData(decoded);
            }
          }
        );

      setIsMonitoring(true);

    } catch (error: any) {

      console.error(error);

      Alert.alert(
        'Monitoring Failed',
        error.message
      );
    }
  };

  // -------------------------
  // Chunked CSV transfer helpers
  // -------------------------

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const getMissingIndices = (): number[] => {
    const missing: number[] = [];
    for (let i = 0; i < expectedTotalRef.current; i++) {
      if (!chunksRef.current.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  };

  const finishTransfer = () => {
    clearWatchdog();

    const total = expectedTotalRef.current;
    const parts: Uint8Array[] = [];

    for (let i = 0; i < total; i++) {
      const chunk = chunksRef.current.get(i);
      if (chunk) parts.push(chunk);
    }

    const fullBuffer = Buffer.concat(parts.map(p => Buffer.from(p)));
    const decoded = fullBuffer.toString('utf8');

    console.log('CSV transfer complete:', fullBuffer.length, 'bytes');

    const type = detectCSVType(decoded);
    setCsvType(type);

    setReceivedData(decoded);

    if (type === 'sensor') {
      setSensorData(parseCSV(decoded));
      setLastSyncedAt(Date.now());
    } else if (type === 'config') {
      // Config/initial CSV - no sensor rows to show, clear any stale data
      setSensorData([]);
    } else {
      // Unrecognised header - keep whatever data we had and don't redirect
      console.warn('Unrecognised CSV from hub, first line:', decoded.split(/\r?\n/)[0]);
      if (!quietRef.current) {
        Alert.alert(
          'Unrecognised data',
          'The hub sent a file the app does not recognise. Try syncing again.'
        );
      }
    }

    setIsTransferring(false);

    if (dataSubRef.current) {
      dataSubRef.current.remove();
      dataSubRef.current = null;
    }

    settleTransfer(type ?? 'unrecognised');
  };

  // Shared exit for a transfer that gave up
  const failTransfer = (title: string, message: string) => {
    if (!quietRef.current) {
      Alert.alert(title, message);
    }
    setIsTransferring(false);
    clearWatchdog();
    if (dataSubRef.current) {
      dataSubRef.current.remove();
      dataSubRef.current = null;
    }
    settleTransfer('failed');
  };

  const armWatchdog = (device: Device) => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      requestRetry(device);
    }, WATCHDOG_MS);
  };

  const requestRetry = async (device: Device) => {
    // No chunk has arrived yet, so we don't know the total and can't ask for
    // specific indices. Without this, an empty "missing" list would finish
    // the transfer with an empty CSV, which detectCSVType reads as 'config'
    // and the dashboard would wrongly redirect to the setup screen.
    if (expectedTotalRef.current === 0) {
      if (retryCountRef.current >= MAX_RETRY_ROUNDS) {
        console.warn('Giving up - no chunks received from hub');
        failTransfer('Transfer failed', 'No data received from the hub.');
        return;
      }

      retryCountRef.current += 1;
      console.log('No chunks yet, resending START');

      try {
        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CONTROL_UUID,
          Buffer.from('START', 'utf8').toString('base64')
        );
      } catch (err) {
        console.error('START resend failed:', err);
      }

      armWatchdog(device);
      return;
    }

    const missing = getMissingIndices();

    if (missing.length === 0) {
      finishTransfer();
      return;
    }

    if (retryCountRef.current >= MAX_RETRY_ROUNDS) {
      console.warn('Giving up after max retry rounds, missing:', missing);
      failTransfer('Transfer incomplete', `Missing ${missing.length} chunk(s) after retries.`);
      return;
    }

    retryCountRef.current += 1;

    const cmd = `RETRY:${missing.join(',')}`;
    console.log('Requesting retry:', cmd);

    try {
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CONTROL_UUID,
        Buffer.from(cmd, 'utf8').toString('base64')
      );
    } catch (err) {
      console.error('Retry write failed:', err);
    }

    armWatchdog(device);
  };

  // -------------------------
  // Request CSV (chunked transfer)
  // -------------------------

  const requestCSV = async (options?: { quiet?: boolean }) => {
    if (!connectedDevice) {
      console.log('No device connected');
      settleTransfer('failed');
      return;
    }

    if (isTransferring) {
      // Any waiter stays attached and is settled when that transfer ends
      console.log('Transfer already in progress, ignoring duplicate requestCSV call');
      return;
    }

    quietRef.current = options?.quiet ?? false;

    // Reset transfer state - including any leftover watchdog from a
    // previous transfer, so a stale timer can't fire a retry against
    // data that's about to be cleared below.
    clearWatchdog();
    chunksRef.current = new Map();
    setTransferProgress({ received: 0, total: 0 });
    expectedTotalRef.current = 0;
    retryCountRef.current = 0;
    setIsTransferring(true);

    if (dataSubRef.current) {
      dataSubRef.current.remove();
      dataSubRef.current = null;
    }

    dataSubRef.current = connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      TX_UUID,
      (error, characteristic) => {
        if (error) {
          // Expected whenever we intentionally remove() an active monitor
          // (a fresh requestCSV call, disconnect, etc.) - the subscription
          // reports its own cancellation as a final callback. Not a real
          // failure, so don't alarm the console or user over it.
          if (error.errorCode === BleErrorCode.OperationCancelled) {
            console.log('Chunk monitor stopped (expected - subscription was replaced or torn down)');
          } else {
            console.error('Chunk monitor error:', error);
          }
          return;
        }

        if (!characteristic?.value) return;

        const raw = Buffer.from(characteristic.value, 'base64');

        if (raw.length < 4) return; // malformed / too short to contain a header

        const chunkIndex = raw.readUInt16LE(0);
        const total = raw.readUInt16LE(2);
        const payload = raw.subarray(4);

        expectedTotalRef.current = total;
        chunksRef.current.set(chunkIndex, payload);
        setTransferProgress({ received: chunksRef.current.size, total });

        console.log(`Chunk ${chunkIndex + 1}/${total} (${payload.length} bytes)`);

        if (chunksRef.current.size >= total) {
          finishTransfer();
        } else {
          armWatchdog(connectedDevice);
        }
      }
    );

    try {
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CONTROL_UUID,
        Buffer.from('START', 'utf8').toString('base64')
      );
    } catch (err) {
      console.error('Failed to write START:', err);
      setIsTransferring(false);
      if (dataSubRef.current) {
        dataSubRef.current.remove();
        dataSubRef.current = null;
      }
      settleTransfer('failed');
      return;
    }

    armWatchdog(connectedDevice);
  };

  // Like requestCSV, but resolves with what came back once the transfer ends
  const requestCSVAndWait = (
    options?: { quiet?: boolean }
  ): Promise<TransferResult> => {
    const done = new Promise<TransferResult>(resolve => {
      transferDoneRef.current = resolve;
    });
    requestCSV(options);
    return done;
  };

  // -------------------------
  // Wait for the hub's verdict after a config write
  // -------------------------

  // The hub answers a config write by advertising data.csv (accepted) or a
  // blank init.csv (rejected - asking for correct info). Poll until one of
  // those arrives. Transfers that fail or come back unrecognised (the hub is
  // still busy validating) are retried until CONFIG_RESULT_TIMING.timeoutMs.
  const waitForConfigResult = async (): Promise<ConfigResult> => {
    configWaitCancelledRef.current = false;
    setIsAwaitingConfigResult(true);

    try {
      await sleep(CONFIG_RESULT_TIMING.settleMs);

      const deadline = Date.now() + CONFIG_RESULT_TIMING.timeoutMs;

      while (Date.now() < deadline) {
        if (configWaitCancelledRef.current) return 'cancelled';

        const result = await requestCSVAndWait({ quiet: true });

        if (configWaitCancelledRef.current) return 'cancelled';
        if (result === 'sensor') return 'accepted';
        if (result === 'config') return 'rejected';

        console.log(`No verdict from hub yet (${result}), polling again`);
        await sleep(CONFIG_RESULT_TIMING.pollIntervalMs);
      }

      return 'timeout';

    } finally {
      setIsAwaitingConfigResult(false);
    }
  };

  // -------------------------
  // Write config CSV back to ESP32
  // -------------------------

  const writeConfig = async (fields: ConfigFields): Promise<boolean> => {
    if (!connectedDevice) {
      console.log('No device connected');
      return false;
    }

    setIsWritingConfig(true);

    try {
      const csv = buildConfigCSV(fields);
      const bytes = Buffer.from(csv, 'utf8');

      const totalChunks = Math.ceil(bytes.length / WRITE_CHUNK_PAYLOAD);

      console.log(`Writing config CSV: ${bytes.length} bytes, ${totalChunks} chunks`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * WRITE_CHUNK_PAYLOAD;
        const end = Math.min(start + WRITE_CHUNK_PAYLOAD, bytes.length);
        const payload = bytes.subarray(start, end);

        const packet = Buffer.alloc(4 + payload.length);
        packet.writeUInt16LE(i, 0);
        packet.writeUInt16LE(totalChunks, 2);
        packet.set(payload, 4); // TypedArray.set - works regardless of whether
                                 // subarray() returned a Buffer or a plain Uint8Array

        // Write-with-response gets an ATT-layer ack from the peripheral,
        // so sequential awaited writes already give us ordered, confirmed
        // delivery per chunk - no separate retry/watchdog protocol needed
        // the way the read path requires (BLE notifications aren't acked).
        await connectedDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CONFIG_WRITE_UUID,
          packet.toString('base64')
        );

        console.log(`Wrote chunk ${i + 1}/${totalChunks}`);
      }

      // Tell the ESP32 the config write is complete
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CONTROL_UUID,
        Buffer.from('WRITE_DONE', 'utf8').toString('base64')
      );

      console.log('Config write complete');

      // The hub is configured now. Clear the 'config' flag from the transfer
      // that sent us to /init, or the dashboard would redirect straight back.
      setCsvType(null);

      return true;

    } catch (error: any) {

      console.error('Config write failed:', error);

      Alert.alert(
        'Write Failed',
        error.message ?? 'Failed to send configuration to device.'
      );

      return false;

    } finally {

      setIsWritingConfig(false);
    }
  };

  // -------------------------
  // Stop monitoring
  // -------------------------

  const stopMonitoring = () => {

    if (subscriptionRef.current) {

      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    setIsMonitoring(false);
  };

  // -------------------------
  // Disconnect
  // -------------------------

  // Stop everything tied to the current connection: subscriptions, timers,
  // any transfer or config wait in progress. `result` is what an awaited
  // transfer (requestCSVAndWait) resolves with.
  const teardownConnection = (result: TransferResult) => {
    // Stop any wait for a config verdict (e.g. disconnecting from /init)
    configWaitCancelledRef.current = true;

    if (disconnectSubRef.current) {
      disconnectSubRef.current.remove();
      disconnectSubRef.current = null;
    }

    stopMonitoring();
    clearWatchdog();
    settleTransfer(result);

    if (dataSubRef.current) {
      dataSubRef.current.remove();
      dataSubRef.current = null;
    }
  };

  // Reset every piece of state tied to the connection/transfer so the next
  // device we connect to starts from a clean slate - otherwise stale
  // sensorData/csvType from a previous session could incorrectly drive the
  // dashboard redirect logic.
  const resetConnectionState = () => {
    setConnectedDevice(null);
    setReceivedData('');
    setSensorData([]);
    setCsvType(null);
    setIsMonitoring(false);
    setIsTransferring(false);
    setIsWritingConfig(false);
    setLastSyncedAt(null);

    chunksRef.current = new Map();
    setTransferProgress({ received: 0, total: 0 });
    expectedTotalRef.current = 0;
    retryCountRef.current = 0;
  };

  // The hub dropped the connection on its own (out of range, powered off,
  // reset). Clean up and flag it - ConnectionLostRedirect sends the user
  // back to the hub screen, which shows a message.
  const handleConnectionLost = () => {
    console.warn('Main controller disconnected unexpectedly');
    teardownConnection('disconnected');
    resetConnectionState();
    setConnectionLost(true);
  };

  const disconnect = async () => {

    // A deliberate disconnect isn't a "lost connection"
    setConnectionLost(false);

    // Detach the drop listener first so our own cancelConnection isn't
    // reported as the hub disconnecting
    teardownConnection('failed');

    if (!connectedDevice) {
      return;
    }

    try {

      // This is the actual BLE-layer disconnect - it tells the OS BLE
      // stack to drop the GATT connection to the peripheral.
      await connectedDevice.cancelConnection();

    } catch (error) {

      console.error('Disconnect error:', error);

    } finally {

      resetConnectionState();
    }
  };

  // -------------------------
  // Provider cleanup
  // -------------------------

  useEffect(() => {

    return () => {

      bleManager.stopDeviceScan();

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }

      if (dataSubRef.current) {
        dataSubRef.current.remove();
      }

      clearWatchdog();

      // IMPORTANT:
      // We don't call disconnect() here.
      //
      // The provider should live for the lifetime
      // of the application.

    };

  }, []);

  return (
    <BLEContext.Provider
      value={{
        devices,
        connectedDevice,
        isScanning,
        isConnecting,
        receivedData,
        sensorData,
        isMonitoring,
        isTransferring,
        transferProgress,
        lastSyncedAt,
        connectionLost,
        isWritingConfig,
        isAwaitingConfigResult,
        csvType,

        startScan,
        clearScan,
        connectToDevice,
        startMonitoring,
        stopMonitoring,
        disconnect,
        requestCSV,
        requestCSVAndWait,
        writeConfig,
        waitForConfigResult,
        requestPermissions,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
}

// -------------------------
// Hook
// -------------------------

export function useBLE() {

  const context = useContext(BLEContext);

  if (!context) {
    throw new Error(
      'useBLE must be used inside BLEProvider'
    );
  }

  return context;
}
