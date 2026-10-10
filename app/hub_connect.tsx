import { router, useFocusEffect } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";
import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import { useBLE } from '../context/BLEContext';
import { Device } from 'react-native-ble-plx';
import { useLogin } from '../hooks/useLogin';

export default function HubConnect() {

    const {
      devices,
      isScanning,
      connectedDevice,
      startScan,
      clearScan,
      connectToDevice,
      disconnect
    } = useBLE();

    // Clear the scan list whenever this screen loses focus (connect, logout,
    // back...) so a stale list of devices isn't shown next time
    useFocusEffect(
      useCallback(() => {
        return () => clearScan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
    );

    const {
      logout
    } = useLogin();
    
    const handleConnect = async (device: Device) => {
      const connected = await connectToDevice(device);
      if (connected) {
        // Navigate to monitor screen after successful connection
        router.push('/dashboard');
      }
    };

    //handle logout
    const handleLogout = async () => {
      // Await so the saved login is gone before /login mounts and re-reads it
      await logout();
      await disconnect();
      router.push("/login");
    }

    
  return (
    <YStack
      flex={1}
      backgroundColor="$gray12"
      items={"center"}
      padding="$4"
      paddingTop={Platform.OS === "android" ? 30 : 60}
      gap="$4"
      width={"100%"}
    >
      <YStack
        flex={1}
        backgroundColor="$gray12"
        borderWidth={2}
        borderColor={"white"}
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        paddingBottom={10}
        rounded={40}
      >
         {/* Top Header */}
        <YStack gap={10} width="100%">
          <XStack justify="space-between">
            <Text color="white" fontSize="$5" fontWeight="bold">
              Connect to Hub
            </Text>
            <Button
              size="$2"
              theme="dark_yellow"
              onPress={startScan}
              disabled={isScanning}
              disabledStyle={{ opacity: 0.3 }}
            >
              Scan
            </Button>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
          <ScrollView width="100%" backgroundColor="transparent">
            <YStack gap="$4">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <Button
                    key={device.id}
                    onPress={() => handleConnect(device)}
                    disabled={!!connectedDevice}
                    theme="dark_green"
                    size="$3"
                    alignSelf="center"
                  >
                    {device.name || device.id}
                  </Button>
                ))
              ) : (
                <Text color="gray" fontSize="$3" alignSelf="center">
                  No Bluetooth devices found
                </Text>
              )}
            </YStack>
          </ScrollView>

        {/* Bottom Buttons */}
        <YStack width="100%" justify="flex-end">
          <YStack gap={10} paddingBottom={10}>
            <XStack
              borderWidth={2}
              justify="flex-end"
              borderColor={"white"}
              padding={10}
              rounded={20}
              width="100%"
              gap={10}
            >
              <Separator
                vertical
                borderColor="gray"
                rounded={3}
                borderBottomWidth={3}
                alignSelf="stretch"
              />
              <Button
                size="$3"
                theme="dark_gray"
                onPress={handleLogout}
              >
                Log Out
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
