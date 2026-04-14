import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useLogin } from "../hooks/useLogin";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";

export default function Login() {

  //login const
  const {
    username, setUsername,
    password, setPassword,
    statusText,
    isLoggingIn,
    isLoggedIn,
    handleLogin,
    logout,
  } = useLogin();

  //push upon login
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/hub_connect");
    }

  }, [isLoggedIn, router]);

  const loginFailed = statusText.toLowerCase().includes("failed") || statusText.toLowerCase().includes("error") || statusText.toLowerCase().includes("not found");

  //is form valid only if both habitat name and connection address are not empty & forms are unique
  const ifFormValid = username.trim() !== "" && password.trim() !== "";

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
        <YStack
          backgroundColor="transparent"
          //flex={1}
          width="100%"
          items="center"
          gap="$4"
          //padding="$5"
        >
          <Text color="white" fontSize="$5" fontWeight="bold">
            Habitat Login
          </Text>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/*form feilds*/}
        <YStack gap="$2" width="100%">
          <Text fontSize="$3" color="white">
            Username
          </Text>
          <Input
            theme="dark_gray"
            outline={loginFailed ? "1px solid red" : "null"}
            width={"100%"}
            size="$4"
            placeholder="Enter Username"
            value={username}
            onChangeText={setUsername}
          />
          <Text fontSize="$3" color="white">
            Password
          </Text>
          <Input
            theme="dark_gray"
            outline={loginFailed ? "1px solid red" : "null"}
            width={"100%"}
            size="$4"
            placeholder="Enter Password"
            value={password}
            onChangeText={setPassword}
          />
          <Text fontSize="$3" color="white">
            {statusText}
          </Text>
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
            justify="flex-end"
            padding={10}
            rounded={20}
            borderWidth={2}
            borderColor={"white"}
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
              theme="dark_green"
              disabled={!ifFormValid || isLoggingIn}
              disabledStyle={{ opacity: 0.5 }}
              onPress={() => {
                handleLogin();
              }}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
