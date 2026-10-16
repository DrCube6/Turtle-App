import { router } from "expo-router";
import { useEffect } from "react";
import { useLogin } from "../hooks/useLogin";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

export default function Login() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();

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
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        paddingBottom={10}
        rounded={40}
      >
        <YStack
          backgroundColor="transparent"
          //flex={1}
          width="100%"
          items="center"
          gap="$4"
          //padding="$5"
        >
          <Text color={colors.text} fontSize="$5" fontWeight="bold">
            Habitat Login
          </Text>
          <Separator
            borderColor={colors.subtle}
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/*form feilds*/}
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
        {/* Bottom Buttons */}
        <YStack
          width="100%"
          backgroundColor="transparent"
          justify="flex-end"
          paddingBottom={10}
          flex={1}
          gap={10}
        >
          <XStack
            justify="space-between"
            alignItems="center"
            padding={10}
            rounded={20}
            borderWidth={2}
            borderColor={colors.border}
            width="100%"
            gap={10}
          >
          <Text fontSize="$3" color={colors.text}>
            {statusText}
          </Text>
          <XStack
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
    </YStack>
  );
}
