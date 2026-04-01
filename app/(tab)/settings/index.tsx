// Week 12: Supabase Auth — MODIFIED (added Sign Out card)
// Week 9: Local Storage — original persistence for notifications toggle
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../../../components/AppCard";
import { theme } from "../../../styles/theme";
import * as storage from "../../../lib/storage";
import { STORAGE_KEYS } from "../../../lib/storage";
import { useAuth } from "../../../context/AuthContext"; // Week 12 - Class Code

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { signOut } = useAuth(); // Week 12 - Class Code

  // Load saved notification preference on mount
  useEffect(() => {
    const loadNotifications = async () => {
      const saved = await storage.get<boolean>(STORAGE_KEYS.NOTIFICATIONS);
      if (saved !== null) {
        setNotifications(saved);
      }
      setIsLoading(false);
    };
    loadNotifications();
  }, []);

  // Save notification preference when toggled
  const handleToggle = async (value: boolean) => {
    setNotifications(value);
    await storage.set(STORAGE_KEYS.NOTIFICATIONS, value);
  };

  // Week 12 - Class Code
  // Week 12: Sign out — AuthGuard in _layout.tsx will redirect to /login
  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Settings</Text>

      <AppCard
        title="Notifications"
        subtitle="Enable app notifications"
        right={
          <Switch value={notifications} onValueChange={handleToggle} />
        }
      />

      <Pressable onPress={() => router.push("/(tab)/settings/profile")}>
        <AppCard
          title="Account"
          subtitle="Update profile settings"
          right={
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.muted}
            />
          }
        />
      </Pressable>

      {/* Week 12 - Class Code */}
      {/* Week 12 — Sign out. Calling signOut() triggers onAuthStateChange in
          AuthContext, which sets session to null, which triggers AuthGuard to
          redirect to /login. No explicit navigation needed here. */}
      <Pressable onPress={handleSignOut}>
        <AppCard
          title="Sign Out"
          subtitle="Sign out of your account"
          right={
            <Ionicons
              name="log-out-outline"
              size={20}
              color={theme.colors.error}
            />
          }
        />
      </Pressable>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.screen,
    backgroundColor: theme.colors.bg,
  },
  h1: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    color: theme.colors.text,
  },
});
