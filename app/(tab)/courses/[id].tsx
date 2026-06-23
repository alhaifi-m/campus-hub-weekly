// Week 13: Supabase DB + Sync — MODIFIED (real course data from Supabase)
// Week 10: API Calls + Loading States — original fetch pattern kept, source replaced
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
import { useAuth } from "../../../context/AuthContext"; // week13 — need user.id to scope the query to this student
import * as db from "../../../lib/db"; // week13 — new database layer, replaces api.ts
import type { CourseDetail } from "../../../lib/db"; // week13 — type for the course + grade + deadlines + announcements shape

const CourseDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth(); // week13 — user.id is required by getCourseDetail to enforce ownership

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await db.getCourseDetail(id!, user!.id); // week13 — replaced api.getCourseById(id) with real Supabase query (3 queries: enrollment + announcements + deadlines)
      setCourse(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
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
        <Pressable style={styles.retryButton} onPress={loadCourse}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ── Data state ──
  // week13 — attendance is now two real numbers from the DB; calculate % here, guard against zero total
  const attendancePct =
    course!.attendanceTotal > 0
      ? Math.round((course!.attendanceAttended / course!.attendanceTotal) * 100)
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.code}>{course?.code}</Text>
      <Text style={styles.h1}>{course?.title}</Text>
      <Text style={styles.description}>{course?.description}</Text>

      {/* Course Info */}
      <Text style={styles.sectionTitle}>Course Info</Text>

      <AppCard
        title="Instructor"
        subtitle={course?.instructor}
        right={
          <Ionicons name="person-outline" size={20} color={theme.colors.muted} />
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

      {/* Week 13 Academic Progress */}  
      <Text style={styles.sectionTitle}>Your Progress</Text>

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
        title="Attendance"
        subtitle={`${course?.attendanceAttended}/${course?.attendanceTotal} classes — ${attendancePct}%`} // week13 — real numbers from enrollments.attendance_attended / attendance_total
        right={
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={theme.colors.primary}
          />
        }
      />

      {/* Upcoming Deadlines */}
      <Text style={styles.sectionTitle}>Deadlines</Text>

      {/* week13 — deadlines is now a real array from the DB; was a single hardcoded string */}
      {course!.deadlines.length === 0 ? (
        <Text style={styles.emptySection}>No upcoming deadlines.</Text> // week13 — empty state for when no deadlines exist in the DB
      ) : (
        course!.deadlines.map((deadline) => ( // week13 — map over all deadlines sorted by due_date ASC
          <AppCard
            key={deadline.id}
            title={deadline.title}
            subtitle={`Due: ${deadline.dueDate}`}
            right={
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
            }
          />
        ))
      )}

      {/* Announcements */}
      <Text style={styles.sectionTitle}>Announcements</Text>

      {/* week13 — announcements is now an array of objects from the DB; was an array of plain strings */}
      {course!.announcements.length === 0 ? (
        <Text style={styles.emptySection}>No announcements yet.</Text> // week13 — empty state for when no announcements exist in the DB
      ) : (
        course!.announcements.map((announcement) => ( // week13 — map over announcement objects, newest first (ordered by created_at DESC)
          <AppCard
            key={announcement.id}
            title={announcement.body} // week13 — announcement is now an object with .id, .body, .createdAt; was a plain string
            right={
              <Ionicons
                name="megaphone-outline"
                size={18}
                color={theme.colors.muted}
              />
            }
          />
        ))
      )}
    </ScrollView>
  );
};

export default CourseDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.screen,
    paddingBottom: 40,
  },
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
  emptySection: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 8,
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
});
