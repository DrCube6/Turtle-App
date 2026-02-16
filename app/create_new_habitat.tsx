import { useRouter } from "expo-router";
import { Button, Input, Separator, SizableText, XStack, YStack } from "tamagui";

export default function CreateNewHabitat() {
  const router = useRouter();
  return (
    <YStack
      items="center"
      justify="center"
      gap="$2"
      flex={1}
      backgroundColor="gray"
    >
      <YStack backgroundColor="white" padding="$4" gap="$2" borderRadius={10}>
        <SizableText size="$6"> Create New Habitat </SizableText>
        <Separator borderColor="black" alignSelf="stretch" />

        <SizableText size="$3"> Habitat Name </SizableText>
        <Input
          theme="surface1"
          size="$2"
          placeholder="Enter Habitat Name"
          //value={habitatName}
          //onChangeText={setHabitatName}
        />
        <SizableText size="$3"> Connection Address </SizableText>
        <Input
          theme="surface1"
          size="$2"
          placeholder="Enter Connection Address"
          //value={connectionAddress}
          //onChangeText={setConnectionAddress}
        />
        <XStack gap="$2" justify="flex-end">
          <Button size="$3" onPress={() => router.back()}>
            Back
          </Button>
          <Button size="$3" disabled={true} disabledStyle={{ opacity: 0.5 }}>
            Save
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
