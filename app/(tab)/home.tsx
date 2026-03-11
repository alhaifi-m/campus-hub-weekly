// Week 10: API Calls + Loading States — MODIFIED (fetch dashboard data from API)
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../../components/AppCard";
import { theme } from "../../styles/theme";
import * as api from "../../lib/api";
import type { DashboardData } from "../../lib/api";

export default function Home() {
  // Week 10: state — data, loading flag, error message
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week 10: extracted fetch function so it can be called on mount AND on retry
  async function loadDashboard() {
    try {
      setError(null);
      setIsLoading(true);
      const result = await api.getDashboard();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  // Week 10: fetch on mount
  useEffect(() => {
    loadDashboard();
  }, []);

  // Week 10: loading state
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Week 10: error state
  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="cloud-offline-outline"
          size={48}
          color={theme.colors.muted}
        />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Week 10: data state
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Campus Hub</Text>
      <Text style={styles.p}>{data?.greeting} — here's your overview</Text>

      <AppCard
        title="Upcoming Deadline"
        subtitle={`${data?.nextDeadline.course} ${data?.nextDeadline.title} — due ${data?.nextDeadline.dueDate}`}
        right={
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={theme.colors.primary}
          />
        }
      />

      <AppCard
        title="Attendance"
        subtitle={`${data?.attendance.attended}/${data?.attendance.total} classes — ${data?.attendance.percentage}%`}
        right={
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={theme.colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.screen,
    backgroundColor: theme.colors.bg,
  },
  // Week 10: centered layout used by loading + error states
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.screen,
  },
  h1: { fontSize: 28, fontWeight: "800", color: theme.colors.text },
  p: { marginTop: 6, marginBottom: 16, color: theme.colors.muted },
  // Week 10: error message + retry button styles
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.primary,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
