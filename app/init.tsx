import { useBLE } from "@/context/BLEContext";
import { useLogin } from "@/hooks/useLogin";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import {
  Button,
  Input,
  ScrollView,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";

export default function Init() {
  const { disconnect, writeConfig, isWritingConfig } = useBLE();
  const { loginState } = useLogin();

  // One field per row in init.csv (Parameters,Value)
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [sampleRate, setSampleRate] = useState('');

  // AUTH KEY still comes from the cloud login response (useLogin) and is
  // still needed later when we build the CSV to send back to the ESP32 -
  // it's just no longer shown as its own input field per your request.
  const [authKey, setAuthKey] = useState('');

  useEffect(() => {
    if (loginState?.appKey) {
      setAuthKey(loginState.appKey);
    }
  }, [loginState]);

  // Confirm only becomes available once every visible field has something in it
  const allFieldsFilled =
    userId.trim().length > 0 &&
    userPassword.trim().length > 0 &&
    wifiSsid.trim().length > 0 &&
    wifiPass.trim().length > 0 &&
    sampleRate.trim().length > 0;

  //handle logout
  const handleLogout = () => {
    disconnect();
    router.push("/login");
  };

  //handle confirm - write the config CSV to the ESP32, then go to the dashboard
  const handleConfirm = async () => {
    const success = await writeConfig({
      userId,
      userPassword,
      wifiSsid,
      wifiPass,
      authKey,
      sampleRate,
    });

    if (success) {
      router.replace('/dashboard');
    }
    // On failure, writeConfig already shows an Alert - stay on this
    // screen so the user can retry without re-entering everything.
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
                Initial Setup
              </Text>
            </XStack>
            <Separator
              borderColor="gray"
              borderBottomWidth={3}
              alignSelf="stretch"
              rounded="$2"
            />
          </YStack>

          {/* Scrollview content - takes remaining space, scrolls under the keyboard */}
          <ScrollView
            width="100%"
            flex={1}
            backgroundColor="transparent"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <YStack gap="$4">
              <YStack gap="$2">
                <Text fontSize="$3" color="white">
                  Cloud Username
                </Text>
                <Input
                  theme="dark_gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter Cloud Username"
                  value={userId}
                  onChangeText={setUserId}
                  autoCapitalize="none"
                />
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color="white">
                  Cloud Password
                </Text>
                <Input
                  theme="dark_gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter Cloud Password"
                  value={userPassword}
                  onChangeText={setUserPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color="white">
                  WIFI SSID
                </Text>
                <Input
                  theme="dark_gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter WiFi SSID"
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  autoCapitalize="none"
                />
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color="white">
                  WIFI Password
                </Text>
                <Input
                  theme="dark_gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter WiFi Password"
                  value={wifiPass}
                  onChangeText={setWifiPass}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color="white">
                  Sample Rate (in minutes)
                </Text>
                <Input
                  theme="dark_gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter Sample Rate"
                  value={sampleRate}
                  onChangeText={setSampleRate}
                  keyboardType="numeric"
                />
              </YStack>
            </YStack>
          </ScrollView>

          {/* Bottom Buttons - fixed height, not flex, so it never competes with the ScrollView */}
          <YStack width="100%" gap={10} paddingBottom={10}>
            <XStack
              borderWidth={2}
              justify="space-between"
              items="center"
              borderColor={"white"}
              padding={10}
              rounded={20}
              width="100%"
              gap={10}
            >
              <Button size="$3" theme="dark_gray" onPress={handleLogout}>
                Logout
              </Button>

              <Button
                size="$3"
                theme="dark_green"
                onPress={handleConfirm}
                disabled={!allFieldsFilled || isWritingConfig}
                disabledStyle={{ opacity: 0.5 }}
              >
                {isWritingConfig ? 'Sending...' : 'Confirm'}
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}