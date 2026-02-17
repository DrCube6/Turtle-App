import { useRouter } from "expo-router";
import { Button, Separator, SizableText, Text, YStack } from "tamagui";

export default function AddHabitat() {
  const router = useRouter();
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
        borderWidth={3}
        borderColor={"white"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        rounded={40}
      >
        <SizableText color="white" size="$8" alignSelf="center">
          {"Add Habitat"}
        </SizableText>
        <Separator
          borderColor="gray"
          borderBottomWidth={3}
          alignSelf="stretch"
        />
        <YStack
          flex={1}
          backgroundColor="$gray12"
          items={"center"}
          width={"100%"}
          gap="$5"
          padding="$5"
          rounded={40}
        >
          <Button
            size="$6"
            theme="dark_blue"
            onPress={() => {
              router.push("/test");
            }}
          >
            Create New Habitat
          </Button>
          <Button
            size="$6"
            theme="dark_green"
            onPress={() => {
              router.push("/add_existing_habitat");
            }}
          >
            <Text fontSize="$5">Add Existing Habitat</Text>
          </Button>
        </YStack>
        <Separator
          borderColor="gray"
          borderBottomWidth={3}
          alignSelf="stretch"
        />
        <Button
          size="$2"
          theme="light_gray_accent"
          alignSelf="flex-end"
          onPress={() => {
            router.back();
          }}
        >
          Cancel
        </Button>
      </YStack>
    </YStack>
  );
}
