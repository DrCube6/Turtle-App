import React from 'react';
import { View, Text, Button, FlatList, Alert } from 'react-native';
import { useBLE } from '../hooks/useBLE';
import { Device } from 'react-native-ble-plx';

export default function BLEScanScreen() {
  const {
    devices,
    isScanning,
    connectedDevice,
    startScan,
    connectToDevice,
  } = useBLE();

  const handleConnect = async (device: Device) => {
    const connected = await connectToDevice(device);
    if (connected) {
      // Navigate to monitor screen after successful connection
      // router.push('/ble-monitor');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        BLE Devices ({devices.length})
      </Text>

      <Button 
        title={isScanning ? "Scanning..." : "Scan for ESP32 Devices"} 
        onPress={startScan} 
        disabled={isScanning}
      />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Button
            title={`Connect to ${item.name || item.id}`}
            onPress={() => handleConnect(item)}
            disabled={!!connectedDevice}
          />
        )}
      />
    </View>
  );
}