// Week 13: Supabase DB + Sync — MODIFIED (real Supabase data + real-time)
// Week 10: API Calls + Loading States — original fetch pattern kept, source replaced
import React, { useEffect, useRef, useState } from "react"; // week13 — useRef added for stale closure fix
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../../../components/AppCard";
import { theme } from "../../../styles/theme";
import { useAuth } from "../../../context/AuthContext"; // week13 — need user.id to pass to the query
import { supabase } from "../../../lib/supabase"; // week13 — needed to set up the real-time subscription
import * as db from "../../../lib/db"; // week13 — new database layer, replaces api.ts mock functions
import type { EnrolledCourse } from "../../../lib/db"; // week13 — type for rows returned by getEnrolledCourses

const CoursesList = () => {
  const { user } = useAuth(); // week13 — user.id is passed to every Supabase query

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable reference so the real-time callback can call the latest version
  const loadCoursesRef = useRef<(() => Promise<void>) | undefined>(undefined); // week13 — ref holds the latest loadCourses so the subscription callback never goes stale

  const loadCourses = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await db.getEnrolledCourses(user!.id); // week13 — replaced api.getCourses() with real Supabase query filtered by user
      setCourses(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      // Optimistic update: keep existing courses visible while refreshing.
      // The spinner shows at the top of the list (via FlatList refreshing prop),
      // but the user keeps seeing their data — no blank screen.
      setRefreshing(true);
      setError(null);
      const result = await db.getEnrolledCourses(user!.id); // week13 — same query as loadCourses but keeps existing data visible (optimistic refresh)
      setCourses(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRefreshing(false);
    }
  };

  // week13 — runs on every render (no deps) to keep the ref pointing at the latest loadCourses
  useEffect(() => {
    // Store latest loadCourses in ref so the subscription callback stays current
    loadCoursesRef.current = loadCourses;
  });

  // week13 — initial load + real-time subscription; empty deps so this runs once on mount
  useEffect(() => {
    // Initial load
    loadCourses();

    // Real-time subscription: when any enrollment row for this user changes
    // (e.g. an instructor updates a grade), re-fetch the courses list.
    const channel = supabase // week13 — open a WebSocket channel to Supabase Realtime
      .channel("enrollments-courses-list")
      .on(
        "postgres_changes",
        {
          event: "*", // week13 — listen for INSERT, UPDATE, and DELETE
          schema: "public",
          table: "enrollments", // week13 — watch the enrollments table
          filter: `user_id=eq.${user!.id}`, // week13 — only this user's rows, not all students
        },
        () => {
          // Re-fetch — the grade or attendance changed
          loadCoursesRef.current?.(); // week13 — call via ref so we always get the latest version
        }
      )
      .subscribe();

    // Cleanup: unsubscribe when this screen unmounts
    return () => {
      supabase.removeChannel(channel); // week13 — close the WebSocket when the screen unmounts to prevent memory leaks
    };
  }, []);

  // ── Loading state (first load only) ──
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
        <Pressable style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ── Data state ──
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Your Courses</Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="book-outline"
              size={48}
              color={theme.colors.muted}
            />
            <Text style={styles.emptyText}>No courses yet.</Text>
            <Text style={styles.emptySubtext}>
              Ask your instructor to enroll you in a course.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tab)/courses/${item.id}`)}>
            <AppCard
              title={item.code}
              subtitle={`${item.title} — ${item.instructor}`}
              right={
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.muted}
                />
              }
            />
          </Pressable>
        )}
      />
    </View>
  );
};

export default CoursesList;

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
  h1: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    color: theme.colors.text,
  },
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
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  emptySubtext: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
