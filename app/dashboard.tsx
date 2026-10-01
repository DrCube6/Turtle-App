import { useEffect } from 'react';
import { Text, Button, YStack, Separator, XStack, ScrollView } from 'tamagui';

import { useBLE } from '@/context/BLEContext';
import { router } from 'expo-router';
import { Platform } from 'react-native';

//my custom esp32 uuids
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const TX_UUID = '87654321-4321-4321-4321-cba987654321';

export default function Dashboard() {

  const {
    connectedDevice,
    receivedData,
    requestCSV,
    sensorData,
    isMonitoring,
    isTransferring,
    csvType,
    startMonitoring,
    stopMonitoring,
  } = useBLE();

  // Only the most recent reading per node (HR === 1)
  const latestNodes = sensorData.filter(row => row.hr === 1);

  // Hub (node 0) battery, most recent reading only
  const hubBattery = latestNodes.find(row => row.node === 0)?.battery;

  // Field nodes 1-12, most recent reading only - used for the list and the average
  const latestFieldNodes = latestNodes.filter(
    row => row.node >= 1 && row.node <= 12
  );

  const averageNodeBattery =
    latestFieldNodes.length > 0
      ? latestFieldNodes.reduce((acc, row) => acc + row.battery, 0) /
        latestFieldNodes.length
      : 0;

  //start monitoring
  useEffect(() => {
    if (!connectedDevice) {
      console.log('Dashboard: no device');
      return;
    }

    console.log(
      'Dashboard connected to:',
      connectedDevice.name
    );

    //kick off the chunked CSV transfer as soon as we're connected
    console.log("Dashboard opened — requesting CSV");
    requestCSV();

  }, [connectedDevice]);

  // Once a transfer finishes, check what kind of CSV came back.
  // If it's the ESP32's initial/unconfigured CSV, send the user to
  // the config screen instead of showing (stale/empty) dashboard data.
  useEffect(() => {
    if (csvType === 'config') {
      console.log('Dashboard: initial config CSV detected, routing to /config');
      router.replace('/init');
    }
  }, [csvType]);

  // Avoid flashing an empty/stale dashboard while a transfer is in
  // progress or right before the redirect above kicks in.
  if (isTransferring || csvType === 'config') {
    return (
      <YStack
        flex={1}
        backgroundColor="$gray12"
        items="center"
        justify="center"
        paddingTop={Platform.OS === "android" ? 30 : 60}
      >
        <Text color="white" fontSize="$5">
          {isTransferring ? 'Syncing...' : 'Redirecting...'}
        </Text>
      </YStack>
    );
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
        <YStack gap={10}>
          <XStack justify="space-between" width="100%">
            <Text color="white" fontSize="$5" fontWeight="bold">
              Dashboard
            </Text>
            <Text color="white" fontSize="$5" fontWeight="bold">
              {hubBattery?.toFixed(2)}%
            </Text>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
          {/* Static Content */}
          <YStack
            padding={15}
            borderWidth={2}
            borderColor={"gray"}
            rounded={10}
          >
            <XStack justify="space-between">
              <YStack>
                <Text color="white" fontSize="$4">
                  Last Sync: 04/18/2026
                </Text>
                <Text color="gray" fontSize="$3">
                  Status: {isTransferring ? 'syncing...' : 'idle'}
                </Text>
              </YStack>
              <Button
                onPress={() => requestCSV()}
                disabled={isTransferring}
                disabledStyle={{ opacity: 0.5 }}
                theme="dark_red"
                size="$3"
                alignSelf="center"
              >
                {isTransferring ? 'Syncing...' : 'Sync'}
              </Button>
            </XStack>
          </YStack>
          <XStack justify="space-between">
            <Text color="white" fontSize="$4">
              Node Average
            </Text>
            <Text color="white" fontSize="$4">
              {averageNodeBattery.toFixed(2)}%
            </Text>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={2}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/* Scrollview content */}
        <ScrollView width="100%" flex={1}>
          <YStack gap="$4">
            {latestFieldNodes
            .map((row) => (
            <Button theme="dark_yellow" 
                onPress={() => router.push({
                  pathname: "/node",
                  params: { node: row.node.toString(), 
                            battery: row.battery.toString(), 
                            temperature: row.temperature.toString(), 
                            humidity: row.humidity.toString() 
                          }
                })}>
              <XStack justify="space-between" flex={1}>
                <Text color="white" fontSize="$4">
                  Node {row.node}
                </Text>
                <Text color="white" fontSize="$4">
                  {row.battery}%
                </Text>
              </XStack>
            </Button>
            ))}
          </YStack>
        </ScrollView>
        {/* Bottom Buttons */}
        <YStack width="100%" justify="flex-end">
          <YStack gap={10} paddingBottom={10} backgroundColor="">
            <XStack
              borderWidth={2}
              justify="space-evenly"
              borderColor={"white"}
              padding={10}
              rounded={20}
              width="100%"
              gap={5}
            >
              <Button
                size="$3"
                theme="dark_blue"
                disabled={true}
                disabledStyle={{ opacity: 0.5 }}
              >
                Dash
              </Button>
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
                onPress={() => router.push("/map")}
              >
                Map
              </Button>
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
                onPress={() => router.push("/config")}
              >
                Config
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
}