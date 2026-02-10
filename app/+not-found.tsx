import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ headerTitle: "Not Found" }} />
            <View
                style={styles.container}>
                <Text style={styles.text}>404 - Not Found</Text>
                <Link href="/" style={styles.button}>
                    Go back to Home screen.
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#5a5555",
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontSize: 32,
        color: "#fff",
    },
    button: {
        fontSize: 18,
        textDecorationLine: "underline",
        color: "#fff",
    }
});
