import { useBLE } from "@/context/BLEContext";
import { useLogin } from "@/hooks/useLogin";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Button,
  Input,
  ScrollView,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";

export default function Init() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  const {
    disconnect,
    writeConfig,
    isWritingConfig,
    waitForConfigResult,
    isAwaitingConfigResult,
  } = useBLE();
  const { loginState } = useLogin();

  // One field per row in init.csv (Parameters,Value)
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [sampleRate, setSampleRate] = useState('');
  // Passwords are hidden; the eye button shows one to check for typos
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);

  // AUTH KEY still comes from the cloud login response (useLogin) and is
  // still needed later when we build the CSV to send back to the ESP32 -
  // it's just no longer shown as its own input field per your request.
  //const authKey = "SiNGzYAVbOHB2rWemXy6dUL7gpZJasjt";
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

  //handle disconnect - drop the main controller (this also cancels any wait
  //for the hub's verdict) but stay logged in to the cloud; go back to the
  //hub screen. Logging out only happens from the hub screen's Log Out.
  const handleDisconnect = async () => {
    await disconnect();
    router.dismissTo("/hub_connect");
  };

  // Result of the last attempt, shown above the buttons
  const [verdict, setVerdict] = useState<'rejected' | 'timeout' | null>(null);
  const isBusy = isWritingConfig || isAwaitingConfigResult;

  // Hub rejected the config (couldn't get online) - outline the WiFi fields
  // red until the next Confirm. Also set while focused, since Tamagui's
  // focus style would otherwise replace the red border as soon as you tap in.
  const wifiError = verdict === 'rejected';

  //handle confirm - write the config CSV to the ESP32, then wait for the hub
  //to answer with data.csv (accepted -> dashboard) or a blank init.csv
  //(rejected -> stay here so the user can correct the info)
  const handleConfirm = async () => {
    setVerdict(null);

    const success = await writeConfig({
      userId,
      userPassword,
      wifiSsid,
      wifiPass,
      authKey,
      sampleRate,
    });

    // On failure, writeConfig already shows an Alert - stay on this
    // screen so the user can retry without re-entering everything.
    if (!success) return;

    const result = await waitForConfigResult();

    if (result === 'accepted') {
      router.replace('/dashboard');
    } else if (result === 'rejected' || result === 'timeout') {
      setVerdict(result);
    }
    // 'cancelled' - user logged out / disconnected, nothing to show
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
                Initial Setup
              </Text>
            </XStack>
            <Separator
              borderColor={colors.subtle}
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
                <Text fontSize="$3" color={colors.text}>
                  Cloud Username
                </Text>
                <Input
                  theme="gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter Cloud Username"
                  value={userId}
                  onChangeText={setUserId}
                  disabled={isBusy}
                  autoCapitalize="none"
                />
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color={colors.text}>
                  Cloud Password
                </Text>
                <XStack items="center" gap={8}>
                  <Input
                    testID="init-user-password"
                    theme="gray"
                    flex={1}
                    size="$4"
                    placeholder="Enter Cloud Password"
                    value={userPassword}
                    onChangeText={setUserPassword}
                    disabled={isBusy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showUserPassword}
                  />
                  <PasswordToggle
                    testID="init-user-password-toggle"
                    visible={showUserPassword}
                    onToggle={() => setShowUserPassword((v) => !v)}
                    color={colors.muted}
                  />
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color={colors.text}>
                  WIFI SSID
                </Text>
                <Input
                  theme="gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter WiFi SSID"
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  disabled={isBusy}
                  autoCapitalize="none"
                  borderColor={wifiError ? "red" : undefined}
                  borderWidth={wifiError ? 2 : undefined}
                  focusStyle={wifiError ? { borderColor: "red", borderWidth: 2 } : undefined}
                />
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color={colors.text}>
                  WIFI Password
                </Text>
                <XStack items="center" gap={8}>
                  <Input
                    testID="init-wifi-password"
                    theme="gray"
                    flex={1}
                    size="$4"
                    placeholder="Enter WiFi Password"
                    value={wifiPass}
                    onChangeText={setWifiPass}
                    disabled={isBusy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showWifiPass}
                    borderColor={wifiError ? "red" : undefined}
                    borderWidth={wifiError ? 2 : undefined}
                    focusStyle={wifiError ? { borderColor: "red", borderWidth: 2 } : undefined}
                  />
                  <PasswordToggle
                    testID="init-wifi-password-toggle"
                    visible={showWifiPass}
                    onToggle={() => setShowWifiPass((v) => !v)}
                    color={colors.muted}
                  />
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontSize="$3" color={colors.text}>
                  Sample Rate (in minutes)
                </Text>
                <Input
                  theme="gray"
                  width={"100%"}
                  size="$4"
                  placeholder="Enter Sample Rate"
                  value={sampleRate}
                  onChangeText={setSampleRate}
                  disabled={isBusy}
                  keyboardType="numeric"
                />
              </YStack>
            </YStack>
          </ScrollView>

          {/* Bottom Buttons - fixed height, not flex, so it never competes with the ScrollView */}
          <YStack width="100%" gap={10} paddingBottom={10}>
            {/* Status of the hub's answer to the last Confirm */}
            {isAwaitingConfigResult && (
              <XStack gap={10} items="center">
                <Spinner size="small" color={colors.text} />
                <Text color={colors.text} fontSize="$3">
                  Waiting for hub to verify the information...
                </Text>
              </XStack>
            )}
            {verdict === 'rejected' && (
              <Text color="red" fontSize="$3">
                The hub could not connect. Check your details and
                try again.
              </Text>
            )}
            {verdict === 'timeout' && (
              <Text color="red" fontSize="$3">
                The hub did not respond.
              </Text>
            )}
            <XStack
              borderWidth={2}
              justify="space-between"
              items="center"
              borderColor={colors.border}
              padding={10}
              rounded={20}
              width="100%"
              gap={10}
            >
              <Button size="$3" theme="gray" onPress={handleDisconnect}>
                Disconnect
              </Button>

              <Button
                size="$3"
                theme="green"
                onPress={handleConfirm}
                disabled={!allFieldsFilled || isBusy}
                disabledStyle={{ opacity: 0.5 }}
              >
                {isWritingConfig
                  ? 'Sending...'
                  : isAwaitingConfigResult
                    ? 'Waiting...'
                    : 'Confirm'}
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}

// Eye button next to a password field: shows/hides what was typed
function PasswordToggle({
  testID,
  visible,
  onToggle,
  color,
}: {
  testID: string;
  visible: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      hitSlop={8}
      // Plain Pressable, no press fade: the icon stays the same gray always
      style={{ padding: 4 }}
    >
      <MaterialCommunityIcons
        // Icon shows the field's current state: crossed-out eye = hidden
        name={visible ? "eye-outline" : "eye-off-outline"}
        size={24}
        color={color}
      />
    </Pressable>
  );
}
