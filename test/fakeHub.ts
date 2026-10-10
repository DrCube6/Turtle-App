// Simulated ESP32 hub for the test bench.
//
// Speaks the same BLE protocol as the firmware, as BLEContext expects it:
//  - CONTROL "START"        -> notify the whole CSV on TX in chunks
//  - CONTROL "RETRY:1,4,.." -> re-notify just those chunks
//  - CONFIG_WRITE packets   -> reassemble the init CSV the app sends
//  - CONTROL "WRITE_DONE"   -> hub is configured, switches to sensor data
// Every chunk is [u16 LE index][u16 LE total][payload], like the firmware.

import { Buffer } from 'buffer';

import { SENSOR_CSV_HEADER } from '@/utils/csv';

export const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
export const TX_UUID = '87654321-4321-4321-4321-cba987654321';
export const CONTROL_UUID = '11223344-1122-1122-1122-112233445566';
export const CONFIG_WRITE_UUID = '99887766-9988-9988-9988-998877665544';

export const NODE_COUNT = 12;
export const HOURS = 24;
const CHUNK_PAYLOAD = 180;

// Deterministic readings so tests can assert exact values.
// hr 1 = most recent, hr 24 = oldest.
export const reading = (node: number, hr: number) => ({
  battery: node === 0 ? 97.5 : 80 + node,
  temperature: Number((70 + node + hr / 10).toFixed(1)),
  humidity: Number((40 + node - hr / 10).toFixed(1)),
});

export function makeSensorCsv(): string {
  const lines = [SENSOR_CSV_HEADER];
  for (let hr = 1; hr <= HOURS; hr++) {
    // node 0 is the hub itself, 1..12 are the field nodes
    for (let node = 0; node <= NODE_COUNT; node++) {
      const r = reading(node, hr);
      lines.push(`${hr},${node},${r.battery},${r.temperature},${r.humidity}`);
    }
  }
  // Firmware writes CRLF line endings
  return lines.join('\r\n') + '\r\n';
}

export const UNCONFIGURED_CSV = [
  'Parameters,Value',
  'ID (For Login User),',
  'Password (For Login User),',
  'WIFI SSID,',
  'WIFI PASS,',
  'AUTH KEY (From Login),',
  'Sample Rate (in Minutes),',
].join('\r\n');

type Listener = (error: any, characteristic: any) => void;

// 'silent' = hub accepts commands but never notifies (out of range, hung)
export type HubMode = 'sensor' | 'config' | 'silent';

class FakeHub {
  mode: HubMode = 'sensor';
  // What the hub sends in each mode - tests can swap in real firmware files
  sensorCsv = makeSensorCsv();
  configCsv = UNCONFIGURED_CSV;
  // Chunk indices lost in the air on their first send only
  dropOnce = new Set<number>();
  controlLog: string[] = [];
  receivedConfigCsv: string | null = null;
  connected = false;
  // Config validation: how long the hub is busy after WRITE_DONE, what it
  // does meanwhile ('silent' = no answer, 'config' = still advertising the
  // old blank init.csv), and whether it accepts what was written
  validationMs = 0;
  busyMode: HubMode = 'silent';
  acceptConfig: (csv: string) => boolean = () => true;

  private listeners = new Map<string, Listener>();
  private configChunks = new Map<number, Buffer>();
  private sent = new Set<number>();

  reset() {
    this.mode = 'sensor';
    this.sensorCsv = makeSensorCsv();
    this.configCsv = UNCONFIGURED_CSV;
    this.dropOnce = new Set();
    this.controlLog = [];
    this.receivedConfigCsv = null;
    this.connected = false;
    this.validationMs = 0;
    this.busyMode = 'silent';
    this.acceptConfig = () => true;
    this.listeners.clear();
    this.configChunks.clear();
    this.sent.clear();
  }

  get chunks(): Buffer[] {
    const csv = Buffer.from(
      this.mode === 'config' ? this.configCsv : this.sensorCsv,
      'utf8'
    );
    const total = Math.ceil(csv.length / CHUNK_PAYLOAD);
    const out: Buffer[] = [];
    for (let i = 0; i < total; i++) {
      const payload = csv.subarray(i * CHUNK_PAYLOAD, (i + 1) * CHUNK_PAYLOAD);
      const packet = Buffer.alloc(4 + payload.length);
      packet.writeUInt16LE(i, 0);
      packet.writeUInt16LE(total, 2);
      packet.set(payload, 4);
      out.push(packet);
    }
    return out;
  }

  subscribe(uuid: string, listener: Listener) {
    this.listeners.set(uuid, listener);
    return {
      remove: () => {
        if (this.listeners.get(uuid) !== listener) return;
        this.listeners.delete(uuid);
        // ble-plx reports its own cancellation as a final error callback
        listener({ errorCode: 2, message: 'Operation was cancelled' }, null);
      },
    };
  }

  private notify(indices: number[]) {
    if (this.mode === 'silent') return;
    const chunks = this.chunks;
    // Async, like real notifications arriving after the write is acked
    setTimeout(() => {
      for (const i of indices) {
        const firstSend = !this.sent.has(i);
        this.sent.add(i);
        if (firstSend && this.dropOnce.has(i)) continue;
        this.listeners.get(TX_UUID)?.(null, {
          value: chunks[i].toString('base64'),
        });
      }
    }, 10);
  }

  write(uuid: string, base64: string) {
    const raw = Buffer.from(base64, 'base64');

    if (uuid === CONFIG_WRITE_UUID) {
      this.configChunks.set(raw.readUInt16LE(0), raw.subarray(4));
      return;
    }

    if (uuid !== CONTROL_UUID) {
      throw new Error(`FakeHub: write to unknown characteristic ${uuid}`);
    }

    const cmd = raw.toString('utf8');
    this.controlLog.push(cmd);

    if (cmd === 'START') {
      this.sent.clear();
      this.notify(this.chunks.map((_, i) => i));
    } else if (cmd.startsWith('RETRY:')) {
      this.notify(cmd.slice(6).split(',').map(Number));
    } else if (cmd === 'WRITE_DONE') {
      const ordered = [...this.configChunks.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, b]) => b);
      this.receivedConfigCsv = Buffer.concat(ordered).toString('utf8');
      this.configChunks.clear();
      // Validate like the firmware: busy for a while, then advertise
      // data.csv (accepted) or a blank init.csv asking for correct info
      const accepted = this.acceptConfig(this.receivedConfigCsv);
      this.mode = this.busyMode;
      setTimeout(() => {
        this.mode = accepted ? 'sensor' : 'config';
      }, this.validationMs);
    }
  }
}

export const hub = new FakeHub();

export function makeDevice(): any {
  const device: any = {
    id: 'AA:BB:CC:DD:EE:FF',
    name: 'Turtle-MC',
    mtu: 23,
    connect: async () => {
      hub.connected = true;
      return device;
    },
    requestMTU: async (mtu: number) => {
      device.mtu = mtu;
      return device;
    },
    discoverAllServicesAndCharacteristics: async () => device,
    monitorCharacteristicForService: (
      service: string,
      uuid: string,
      listener: Listener
    ) => {
      if (service !== SERVICE_UUID) throw new Error('FakeHub: bad service');
      return hub.subscribe(uuid, listener);
    },
    writeCharacteristicWithResponseForService: async (
      service: string,
      uuid: string,
      base64: string
    ) => {
      if (service !== SERVICE_UUID) throw new Error('FakeHub: bad service');
      hub.write(uuid, base64);
      return device;
    },
    cancelConnection: async () => {
      hub.connected = false;
      return device;
    },
  };
  return device;
}
