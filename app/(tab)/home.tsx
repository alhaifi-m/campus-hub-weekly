// Week 13: Supabase DB + Sync — MODIFIED (live dashboard data from Supabase)
// Week 12: Supabase Auth — MODIFIED (show signed-in user email)
// Week 10: API Calls + Loading States — original fetch pattern kept, source replaced
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
import { useAuth } from "../../context/AuthContext";
import * as db from "../../lib/db"; // week13 — new database layer, replaces api.ts
import type { DashboardData } from "../../lib/db"; // week13 — type for greeting + nextDeadline + attendance from Supabase

const Home = () => {
  const { user } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await db.getDashboardData(user!.id); // week13 — replaced api.getDashboard() with real Supabase query (attendance summed across all enrollments, next deadline from DB)
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ── Loading state ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // ── Error state ──
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

  // ── Data state ──
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Campus Hub</Text>

      {/* Week 12: signed-in user email */}
      {user?.email && (
        <Text style={styles.userEmail}>{user.email}</Text>
      )}

      <Text style={styles.p}>{data?.greeting} — here's your overview</Text>

      {/* week13 — nextDeadline is now nullable; real DB may have no upcoming deadlines (mock always had one hardcoded) */}
      {data?.nextDeadline ? (
        <AppCard
          title="Upcoming Deadline"
          subtitle={`${data.nextDeadline.course} ${data.nextDeadline.title} — due ${data.nextDeadline.dueDate}`} // week13 — real course code + deadline title + due date from the deadlines table
          right={
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={theme.colors.primary}
            />
          }
        />
      ) : (
        <AppCard // week13 — empty state; shown when no deadlines with due_date >= today exist in the DB
          title="Upcoming Deadline"
          subtitle="No upcoming deadlines"
          right={
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={theme.colors.primary}
            />
          }
        />
      )}

      <AppCard
        title="Attendance"
        subtitle={
          data
            ? `${data.attendance.attended}/${data.attendance.total} classes — ${data.attendance.percentage}%` // week13 — real numbers summed across all enrollments; was a hardcoded "36/42" string
            : "No data yet"
        }
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
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.screen,
    backgroundColor: theme.colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.screen,
  },
  h1: { fontSize: 28, fontWeight: "800", color: theme.colors.text },
  userEmail: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  p: { marginTop: 6, marginBottom: 16, color: theme.colors.muted },
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
