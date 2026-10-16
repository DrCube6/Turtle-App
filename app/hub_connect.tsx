import { router, useFocusEffect } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";
import React, { useCallback, useState } from 'react';
import { useBLE } from '../context/BLEContext';
import { Device } from 'react-native-ble-plx';
import { useLogin } from '../hooks/useLogin';

export default function HubConnect() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();

    const {
      devices,
      isScanning,
      isConnecting,
      connectionLost,
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
    
    // Which device is being connected to, to label its button
    const [connectingId, setConnectingId] = useState<string | null>(null);

    const handleConnect = async (device: Device) => {
      setConnectingId(device.id);
      const connected = await connectToDevice(device);
      setConnectingId(null);
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
      backgroundColor={colors.background}
      items={"center"}
      padding="$4"
      paddingTop={screenPadding.paddingTop}
      paddingBottom={screenPadding.paddingBottom}
      gap="$4"
      width={"100%"}
    >
      <YStack
        flex={1}
        backgroundColor={colors.background}
        borderWidth={2}
        borderColor={colors.border}
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
            <Text color={colors.text} fontSize="$5" fontWeight="bold">
              Connect to Hub
            </Text>
            <Button
              size="$2"
              theme="yellow"
              onPress={startScan}
              disabled={isScanning || isConnecting}
              disabledStyle={{ opacity: 0.3 }}
            >
              Scan
            </Button>
          </XStack>
          <Separator
            borderColor={colors.subtle}
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
                    disabled={!!connectedDevice || isConnecting}
                    disabledStyle={{ opacity: 0.6 }}
                    theme="green"
                    size="$3"
                    alignSelf="center"
                  >
                    {connectingId === device.id
                      ? `Connecting to ${device.name || device.id}...`
                      : device.name || device.id}
                  </Button>
                ))
              ) : (
                <Text color={colors.muted} fontSize="$3" alignSelf="center">
                  No Bluetooth devices found
                </Text>
              )}
            </YStack>
          </ScrollView>

        {/* Bottom Buttons */}
        <YStack width="100%" justify="flex-end">
          <YStack gap={10} paddingBottom={10}>
            {/* The hub dropped the connection on its own - cleared on the
                next Scan or connect */}
            {connectionLost && (
              <Text color="red" fontSize="$3">
                The main controller was disconnected. Scan and connect to
                reconnect.
              </Text>
            )}
            <XStack
              borderWidth={2}
              justify="flex-end"
              borderColor={colors.border}
              padding={10}
              rounded={20}
              width="100%"
              gap={10}
            >
              <Separator
                vertical
                borderColor={colors.subtle}
                rounded={3}
                borderBottomWidth={3}
                alignSelf="stretch"
              />
              <Button
                size="$3"
                theme="gray"
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
