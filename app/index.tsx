import { useRouter } from "expo-router";
import { useEffect } from "react";
import { SizableText, Spinner, YStack } from "tamagui";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

export default function Index() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  //route to habitat selection
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 200);

    return () => clearTimeout(timer);
  }, [router]);

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
        borderWidth={3}
        borderColor={colors.border}
        items={"center"}
        justify={"center"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        rounded={40}
      >
        <Spinner size="large" color={colors.text}></Spinner>
        <SizableText mt="$4" size="$6" color={colors.text}>
          Welcome...
        </SizableText>
      </YStack>
    </YStack>
  );
}
