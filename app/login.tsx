import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch } from "react-native";
import { useLogin } from "../hooks/useLogin";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";
import { Logo, LOGO_ASPECT } from "@/components/Logo";

// Gap kept above and below the logo
const LOGO_GAP = 8;

export default function Login() {
  const screenPadding = useScreenPadding();
  const { colors, mode, setMode } = useAppTheme();

  // Space between the password field and the preferences, measured with the
  // keyboard closed. The logo fills it (keeping its shape) minus a small gap.
  const [logoSpace, setLogoSpace] = useState({ width: 0, height: 0 });
  const logoWidth = Math.max(
    0,
    Math.min(logoSpace.width, (logoSpace.height - 2 * LOGO_GAP) * LOGO_ASPECT)
  );

  //login const
  const {
    username, setUsername,
    password, setPassword,
    statusText,
    isLoggingIn,
    isLoggedIn,
    handleLogin,
  } = useLogin();

  //push upon login
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/hub_connect");
    }

  }, [isLoggedIn]);

  const loginFailed = statusText.toLowerCase().includes("failed") || statusText.toLowerCase().includes("error") || statusText.toLowerCase().includes("not found");

  //is form valid only if both habitat name and connection address are not empty & forms are unique
  const ifFormValid = username.trim() !== "" && password.trim() !== "";

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
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        paddingBottom={10}
        rounded={40}
      >
        {/* Fixed header - stays put while the middle scrolls */}
        <YStack width="100%" items="center" gap="$4">
          <Text color={colors.text} fontSize="$5" fontWeight="bold">
            Welcome!
          </Text>
          <Separator
            borderColor={colors.subtle}
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>

        {/* Only the middle scrolls: fields, logo, preferences. When the
            keyboard opens the frame shrinks, the login bar below rides up
            with it, and this part scrolls instead of being squashed. */}
        <ScrollView
          testID="login-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/*form fields*/}
          <YStack gap="$2" width="100%">
            <Text fontSize="$3" color={colors.text}>
              Username
            </Text>
            <Input
              theme="gray"
              borderColor={loginFailed ? "red" : undefined}
              width={"100%"}
              size="$4"
              placeholder="Enter Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Text fontSize="$3" color={colors.text}>
              Password
            </Text>
            <Input
              theme="gray"
              borderColor={loginFailed ? "red" : undefined}
              width={"100%"}
              size="$4"
              placeholder="Enter Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </YStack>

          {/* Logo between the password field and the preferences, as large
              as the space allows with a small gap above and below. Part of
              the layout, so it can never sit on top of the fields. */}
          <YStack
            testID="login-logo-space"
            flex={1}
            items="center"
            justify="center"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              // Keep the largest space seen (keyboard closed), so opening
              // the keyboard scrolls rather than shrinking the logo
              setLogoSpace((prev) =>
                height > prev.height ? { width, height } : prev
              );
            }}
          >
            {logoWidth > 0 && (
              <Logo width={logoWidth} opacity={mode === "dark" ? 0.12 : 0.18} />
            )}
          </YStack>

          {/* Preferences */}
          <YStack gap={10} width="100%">
            <XStack justify="space-between" items="center" paddingHorizontal={4}>
              <Text fontSize="$4" color={colors.text}>
                Dark Theme
              </Text>
              {/* Same app-wide, saved setting as Config's switch */}
              <Switch
                testID="login-dark-theme-switch"
                value={mode === "dark"}
                onValueChange={(on) => setMode(on ? "dark" : "light")}
                trackColor={{ false: "#555", true: "rgb(37, 99, 235)" }}
                thumbColor="white"
              />
            </XStack>
          </YStack>
        </ScrollView>

        {/* Fixed login bar - outside the scroll, so it stays just above the
            keyboard */}
        <XStack
          testID="login-bar"
          justify="space-between"
          alignItems="center"
          padding={10}
          rounded={20}
          borderWidth={2}
          borderColor={colors.border}
          width="100%"
          gap={10}
          marginBottom={10}
        >
          <Text fontSize="$3" color={colors.text}>
            {statusText}
          </Text>
          <XStack gap={10}>
            <Separator
              vertical
              borderColor={colors.subtle}
              rounded={3}
              borderBottomWidth={3}
              alignSelf="stretch"
            />
            <Button
              size="$3"
              theme="green"
              disabled={!ifFormValid || isLoggingIn}
              disabledStyle={{ opacity: 0.5 }}
              onPress={() => {
                handleLogin();
              }}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  // Fills the space when there's room (fields top, logo middle,
  // preferences bottom) and scrolls when there isn't
  scrollContent: {
    flexGrow: 1,
    gap: 16,
  },
});
