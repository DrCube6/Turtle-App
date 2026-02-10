import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts } from "@/constants/theme";
import { useFonts } from "expo-font";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

const app = () => {
  const [loaded] = useFonts({
    Cooper_Hewit: require("../../assets/fonts/cooper_hewit_bold.ttf"),
  });
  return (
    <ParallaxScrollView
      headerBackgroundColor={{}}
      headerImage={
        <Image
          source={require("@/assets/images/turtle_heading.webp")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          Home
        </ThemedText>
      </ThemedView>
      <ThemedText type="default" style={{ fontFamily: "arial" }}>
        This app includes a custom font (Cooper Hewit) loaded using Expo
      </ThemedText>
    </ParallaxScrollView>
  );
};

export default app;

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
