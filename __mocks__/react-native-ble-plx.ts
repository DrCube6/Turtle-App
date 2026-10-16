// Jest picks this up automatically in place of the native BLE library.
// Scanning "finds" the simulated hub from test/fakeHub.
import { hub, makeDevice } from '@/test/fakeHub';

export const BleErrorCode = {
  OperationCancelled: 2,
};

export class BleManager {
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
