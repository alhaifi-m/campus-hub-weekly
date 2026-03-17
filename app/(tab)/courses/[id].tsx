// Week 10: API Calls + Loading States — MODIFIED (full detail page with API fetch)
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../../../components/AppCard";
import { theme } from "../../../styles/theme";
import * as api from "../../../lib/api";
import type { CourseDetail } from "../../../lib/api";

export default function CourseDetails() {
  // Week 10: read the dynamic route param (e.g. "cprg303")
  const { id } = useLocalSearchParams<{ id: string }>();

  // Week 10: state — course detail, loading flag, error message
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week 10: extracted fetch function — passes id to API, enables retry
  async function loadCourse() {
    try {
      setError(null);
      setIsLoading(true);
      const result = await api.getCourseById(id!);
      setCourse(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  // Week 10: fetch on mount
  useEffect(() => {
    loadCourse();
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
        <Pressable style={styles.retryButton} onPress={loadCourse}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Week 10: data state — course detail with announcements
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.code}>{course?.code}</Text>
      <Text style={styles.h1}>{course?.title}</Text>
      <Text style={styles.description}>{course?.description}</Text>

      {/* Info Cards */}
      <Text style={styles.sectionTitle}>Course Info</Text>

      <AppCard
        title="Instructor"
        subtitle={course?.instructor}
        right={
          <Ionicons
            name="person-outline"
            size={20}
            color={theme.colors.muted}
          />
        }
      />
      <AppCard
        title="Schedule"
        subtitle={course?.schedule}
        right={
          <Ionicons name="time-outline" size={20} color={theme.colors.muted} />
        }
      />
      <AppCard
        title="Room"
        subtitle={course?.room}
        right={
          <Ionicons
            name="location-outline"
            size={20}
            color={theme.colors.muted}
          />
        }
      />
      <AppCard
        title="Grade"
        subtitle={course?.grade}
        right={
          <Ionicons
            name="school-outline"
            size={20}
            color={theme.colors.muted}
          />
        }
      />
      <AppCard
        title="Next Deadline"
        subtitle={course?.nextDeadline}
        right={
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={theme.colors.primary}
          />
        }
      />
      <AppCard
        title="Attendance"
        subtitle={course?.attendance}
        right={
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={theme.colors.primary}
          />
        }
      />

      {/* Announcements */}
      <Text style={styles.sectionTitle}>Announcements</Text>

      {course?.announcements.map((text, index) => (
        <AppCard
          key={index}
          title={text}
          right={
            <Ionicons
              name="megaphone-outline"
              size={18}
              color={theme.colors.muted}
            />
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.screen,
    paddingBottom: 40,
  },
  // Week 10: centered layout used by loading + error states
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.screen,
  },
  code: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  h1: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 10,
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
});
