import { useRouter } from "expo-router";
import { Button, YStack } from "tamagui";

export default function Test() {
  const router = useRouter();

  return (
    <YStack items="center" justify="center" flex={1}>
      <Button
        size="$2"
        theme="black_accent"
        onPress={() => {
          console.log("button_pressed");
          router.push("/create_new_habitat");
        }}
      >
        Add
      </Button>
    </YStack>
  );
}
