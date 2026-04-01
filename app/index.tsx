// Week 12: Supabase Auth — MODIFIED
// Initial redirect based on auth state.
// AuthGuard in _layout.tsx handles ongoing protection after navigation.
// This file handles the first render when the app opens cold.
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext"; // Week 12 - Class Code
import { theme } from "../styles/theme";

const Index = () => {
  // Week 12 - Class Code
  const { session, isLoading } = useAuth();

  // Week 12 - Class Code
  // Show a spinner while AsyncStorage is being read (usually < 100ms)
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Session found → go straight to the app (user was already signed in)
  // No session → go to login screen
  // Week 12 - Class Code
  return <Redirect href={session ? "/(tab)/home" : "/login"} />;
};

export default Index;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
  },
});
