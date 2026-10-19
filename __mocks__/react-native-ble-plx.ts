// Jest picks this up automatically in place of the native BLE library.
// Scanning "finds" the simulated hub from test/fakeHub.
import { hub, makeDevice } from '@/test/fakeHub';

export const BleErrorCode = {
  OperationCancelled: 2,
};

export const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn',
} as const;

export class BleManager {
  async state() {
    return hub.bluetoothState;
  }

  onStateChange(listener: (state: string) => void, emitCurrentState?: boolean) {
    hub.stateListeners.add(listener);
    if (emitCurrentState) listener(hub.bluetoothState);
    return { remove: () => hub.stateListeners.delete(listener) };
  }

  startDeviceScan(
    _uuids: string[] | null,
    _options: object,
    listener: (error: any, device: any) => void
  ) {
    hub.scanning = true;
    setTimeout(() => {
      if (hub.scanning) listener(null, makeDevice());
    }, 10);
  }

  stopDeviceScan() {
    hub.scanning = false;
  }

  async cancelDeviceConnection(_id: string) {
    hub.connected = false;
  }
}
