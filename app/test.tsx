import { SizableText, YStack } from 'tamagui';

export default function Test() {
    return (
        <YStack flex={1} items="center" justify="center" bg="$background">
            <YStack borderWidth={1} borderColor="$blue10" p="$4" rounded={10} background="$blue3">
                <SizableText size="$6">Test</SizableText>
            </YStack>
        </YStack>
    );
}