import { useBLE } from "@/hooks/useBLE";
import { router } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";

export default function HubConnect() {
  //ble const
  const {
    devices,
    connectedDevice,
    isScanning,
    connectToDevice,
    startScan
  } = useBLE();

  const handleConnect = async (device: Device) => {
      const connected = await connectToDevice(device);
      if (connected) {
        console.log("Connected to device:", device.name);
      }
    };

  return (
    <YStack
      flex={1}
      backgroundColor="$gray12"
      items={"center"}
      padding="$4"
      paddingTop={60}
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
        <YStack
          flex={1}
          width="100%"
          items="center"
          gap="$4"
          //padding="$5"
        >
          <Text color="white" fontSize="$5" fontWeight="bold">
            Connect to Hub
          </Text>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
          <ScrollView width="100%" backgroundColor="transparent">
            <YStack gap="$4">
              <Text color="gray" fontSize="$3" alignSelf="center">
                No Bluetooth devices found
              </Text>
              <Button
                onPress={() => router.push("/dashboard")}
                theme="dark_green"
                size="$3"
                alignSelf="center"
              >
                device102-3917-493
              </Button>
            </YStack>
          </ScrollView>
        </YStack>
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
