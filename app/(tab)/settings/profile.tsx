// Week 9: Local Storage — MODIFIED (persistence + view/edit mode, built on Week 8 React Hook Form + Zod)
import React, { useEffect, useState } from "react"; // useEffect week 9
import {
  ActivityIndicator, // week 9
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { theme } from "../../../styles/theme";
import * as storage from "../../../lib/storage";  // week 9
import { STORAGE_KEYS } from "../../../lib/storage";  // week 9

// Zod schema — unchanged from Week 8
const profileSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters."),
  lastName:  z.string().trim().min(2, "Last name must be at least 2 characters."),
  email:     z.string().trim().email("Please enter a valid email address."),
  studentId: z.string().trim().length(9, "Student ID must be exactly 9 characters."),
  phone:     z.string().refine(
    (val) => val.replace(/\D/g, "").length >= 10,
    "Phone number must have at least 10 digits."
  ),
});

type ProfileForm = z.infer<typeof profileSchema>;

const Profile = () => {
  const [isLoading, setIsLoading] = useState(true); // week 9: track loading state while we load saved profile data
  const [isEditing, setIsEditing] = useState(false); // week 9: track whether we're in edit mode or view mode
  const [hasSavedData, setHasSavedData] = useState(false); // week 9 track whether we have any saved data, to determine whether to show Cancel button (only show if we have saved data to cancel back to)

  const {
    control,
    handleSubmit,
    reset, // week 9: added reset function to reset form values when cancelling edits
    watch, // week 9: added watch function to track form values for enabling/disabling Save button
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      studentId: "",
      phone: "",
    },
    mode: "onSubmit",
  });

  // Track field values to enable/disable the Save button    // week 9
  const watchedValues = watch();
  // Check if all fields have some value (basic check to prevent saving empty form, since Zod validation only runs on submit)
  // it will produce an array of all field values, check that every value has length > 0 (i.e. is not an empty string)
  // e.g ["Jane", "Smith", "", "A00123456", "(403) 555-0123"] => false because email is empty
  const isFormFilled = Object.values(watchedValues).every((v) => v.length > 0);

  // Load saved profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      const saved = await storage.get<ProfileForm>(STORAGE_KEYS.PROFILE);
      if (saved !== null) {
        reset(saved); // pre-fill the form with saved data
        setHasSavedData(true);
      } else {
        setIsEditing(true); // first visit — start in edit mode
      }
      setIsLoading(false);
    };
    loadProfile();
  }, []);

  // RHF calls this only after Zod validation passes
  const onSubmit = async (data: ProfileForm) => {
    // Save the validated profile data to local storage
    await storage.set(STORAGE_KEYS.PROFILE, data);
    setHasSavedData(true);
    setIsEditing(false); // switch to view mode — the view IS the confirmation
  };

  const handleCancel = async () => {
    // On cancel, we want to discard any unsaved changes and reset the form back to the last saved values
    // To do this, we can load the saved profile data from storage again and use the reset function from React Hook Form to reset the form values
    const saved = await storage.get<ProfileForm>(STORAGE_KEYS.PROFILE);
    if (saved !== null) {
      reset(saved); // restore saved values, discarding any in-progress edits
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Week 9: View/Edit mode toggle — we use the same form for both viewing and editing, just render it differently based on isEditing state
  // VIEW MODE — show saved profile as a read-only card
  if (!isEditing) {
    const values = watch();
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>My Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>First Name</Text>
            <Text style={styles.profileValue}>{values.firstName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Last Name</Text>
            <Text style={styles.profileValue}>{values.lastName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>{values.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Student ID</Text>
            <Text style={styles.profileValue}>{values.studentId}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Phone Number</Text>
            <Text style={styles.profileValue}>{values.phone}</Text>
          </View>
        </View>

        <Pressable style={styles.button} onPress={() => setIsEditing(true)}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // EDIT MODE — React Hook Form + Zod validation (built on Week 8)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Edit Profile</Text>

      {/* First Name */}
      <Text style={styles.label}>First Name</Text>
      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            placeholder="e.g. Jane"
            placeholderTextColor={theme.colors.muted}
            value={value}
            onChangeText={onChange}
            autoCapitalize="words"
          />
        )}
      />
      {errors.firstName && (
        <Text style={styles.error}>{errors.firstName.message}</Text>
      )}

      {/* Last Name */}
      <Text style={styles.label}>Last Name</Text>
      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            placeholder="e.g. Smith"
            placeholderTextColor={theme.colors.muted}
            value={value}
            onChangeText={onChange}
            autoCapitalize="words"
          />
        )}
      />
      {errors.lastName && (
        <Text style={styles.error}>{errors.lastName.message}</Text>
      )}

      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="e.g. jane.smith@edu.ca"
            placeholderTextColor={theme.colors.muted}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      {errors.email && (
        <Text style={styles.error}>{errors.email.message}</Text>
      )}

      {/* Student ID */}
      <Text style={styles.label}>Student ID</Text>
      <Controller
        control={control}
        name="studentId"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.studentId && styles.inputError]}
            placeholder="e.g. A00123456"
            placeholderTextColor={theme.colors.muted}
            value={value}
            onChangeText={onChange}
            autoCapitalize="characters"
            maxLength={9}
          />
        )}
      />
      {errors.studentId && (
        <Text style={styles.error}>{errors.studentId.message}</Text>
      )}

      {/* Phone Number */}
      <Text style={styles.label}>Phone Number</Text>
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="e.g. (403) 555-0123"
            placeholderTextColor={theme.colors.muted}
            value={value}
            onChangeText={onChange}
            keyboardType="phone-pad"
          />
        )}
      />
      {errors.phone && (
        <Text style={styles.error}>{errors.phone.message}</Text>
      )}

      {/* Buttons */}
      {/* Week 9: if we have saved data, show both Cancel and Save buttons side by side, if we don't have saved data (i.e. first time filling out form), just show the Save button centered */}
      {hasSavedData ? (
        <View style={styles.buttonRow}>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, !isFormFilled && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isFormFilled}
          >
            <Text style={styles.buttonText}>Save Profile</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.button, !isFormFilled && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isFormFilled}
        >
          <Text style={styles.buttonText}>Save Profile</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.screen,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
  },
  h1: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
    color: theme.colors.text,
  },

  // View mode styles
  profileCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  profileRow: {
    padding: 16,
  },
  profileLabel: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },

  // Edit mode styles
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: 4,
  },

  // Button styles
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.input,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  // Week 9: disabled button style (used when form is not completely filled out)
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  // week 9: styles for the Cancel and Save buttons when we have saved data (i.e. we're showing both buttons side by side)
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  // week 9: cancel button is a secondary outlined style, only shows when we have saved data to cancel back to
  cancelButton: {
    flex: 1,
    borderRadius: theme.radius.input,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  // week 9: cancel button text is a muted color to indicate it's a secondary action
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  // week 9: save button takes up remaining space, same primary style as before, but disabled when form is not completely filled out
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.input,
    padding: 16,
    alignItems: "center",
  },
});
