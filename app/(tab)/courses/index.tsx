// Week 10: API Calls + Loading States — MODIFIED (fetch courses from API + pull-to-refresh)
import React, { useEffect, useState } from "react";
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
import * as api from "../../../lib/api";
import type { Course } from "../../../lib/api";

export default function CoursesList() {
  // Week 10: state — courses list, loading flag, refresh flag, error message
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Week 10: extracted fetch function — used on mount and on retry
  async function loadCourses() {
    try {
      setError(null);
      setIsLoading(true);
      const result = await api.getCourses();
      setCourses(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  // Week 10: pull-to-refresh handler — separate refreshing flag keeps spinner visible
  async function handleRefresh() {
    try {
      setRefreshing(true);
      setError(null);
      const result = await api.getCourses();
      setCourses(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRefreshing(false);
    }
  }

  // Week 10: fetch on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Week 10: loading state (first load only)
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
        <Pressable style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Week 10: data state — FlatList with pull-to-refresh + empty component
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Your Courses</Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No courses found.</Text>
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
  h1: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    color: theme.colors.text,
  },
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
  // Week 10: empty list style — shown via ListEmptyComponent
  emptyText: {
    textAlign: "center",
    color: theme.colors.muted,
    marginTop: 40,
    fontSize: 15,
  },
});
