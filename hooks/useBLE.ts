import { useState, useEffect, useRef } from 'react';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

const bleManager = new BleManager();

export function useBLE() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [receivedData, setReceivedData] = useState<string>('');
  const [isMonitoring, setIsMonitoring] = useState(false);

  const subscriptionRef = useRef<any>(null);

  // Request permissions (Android 12+)
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Scan for nearby devices
  const startScan = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Bluetooth permissions are required');
      return;
    }

    setIsScanning(true);
    setDevices([]);

    bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.error(error);
        setIsScanning(false);
        return;
      }

      if (device && device.name) {
        setDevices(prev => {
          if (prev.find(d => d.id === device.id)) return prev;
          return [...prev, device];
        });
      }
    });

    // Stop scanning after 12 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 12000);
  };

  // Connect to a device
  const connectToDevice = async (device: Device) => {
    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(connected);
      Alert.alert('Connected', `Connected to ${device.name || device.id}`);
      
      return connected;
    } catch (error: any) {
      Alert.alert('Connection Failed', error.message);
      return null;
    }
  };

  // Start monitoring notifications from ESP32
  const startMonitoring = async (serviceUUID: string, characteristicUUID: string) => {
    if (!connectedDevice) return;

    try {
      subscriptionRef.current = connectedDevice.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error(error);
            return;
          }
          if (characteristic?.value) {
            const decoded = Buffer.from(characteristic.value, 'base64').toString('utf8');
            setReceivedData(decoded);
          }
        }
      );
      setIsMonitoring(true);
    } catch (error: any) {
      Alert.alert('Monitoring Failed', error.message);
    }
  };

  // Stop monitoring
  const stopMonitoring = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsMonitoring(false);
  };

  // Disconnect
  const disconnect = async () => {
    if (connectedDevice) {
      await connectedDevice.cancelConnection();
      setConnectedDevice(null);
      stopMonitoring();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bleManager.stopDeviceScan();
      disconnect();
    };
  }, []);

  return {
    devices,
    connectedDevice,
    isScanning,
    receivedData,
    isMonitoring,
    startScan,
    connectToDevice,
    startMonitoring,
    stopMonitoring,
    disconnect,
    requestPermissions,
  };
}