import '@tamagui/native/setup-zeego';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SizableText, Spinner, YStack } from 'tamagui';

export default function Index() {
//route to habitat selection
const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/test');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <YStack flex={1} items="center" justify="center" bg="$background">
      <Spinner size="large" color="$blue10" />
      <SizableText mt="$4" size="$6">Welcome...</SizableText>
    </YStack>
  );
}