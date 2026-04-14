import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SizableText, Spinner, YStack } from "tamagui";

export default function Index() {
  //route to habitat selection
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 200);

    return () => clearTimeout(timer);
  }, []);

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
        borderWidth={3}
        borderColor={"white"}
        items={"center"}
        justify={"center"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        rounded={40}
      >
        <Spinner size="large" color="white"></Spinner>
        <SizableText mt="$4" size="$6" color="white">
          Welcome...
        </SizableText>
      </YStack>
    </YStack>
  );
}
