import { router } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";
import React from 'react';
import { FlatList, Alert, Platform } from 'react-native';
import { useBLE } from '../hooks/useBLE';
import { Device } from 'react-native-ble-plx';

export default function HubConnect() {

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
        router.push('/dashboard');
      }
    };

    
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
        <YStack width="100%" justify="flex-end" flex={1}>
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
                onPress={() => router.push("/login")}
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
