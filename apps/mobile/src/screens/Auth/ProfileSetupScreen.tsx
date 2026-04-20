import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@jam-app/convex";
import { authClient } from "../../lib/auth-client";
import { useMobileTheme } from "@/theme/MobileTheme";

export default function ProfileSetupScreen() {
  const { colors } = useMobileTheme();
  const createProfile = useMutation(api.profiles.createProfile);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername) {
      setError("Username is required.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await createProfile({
        username: trimmedUsername,
        displayName: trimmedDisplayName || trimmedUsername,
      });
    } catch (err) {
      setError(getProfileErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    await authClient.signOut();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.success }]}>Almost there</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Pick your stage name
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              This profile is required before you can enter Jam.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.secondaryForeground }]}>
                Username
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                maxLength={15}
                onChangeText={(value) => {
                  setUsername(value);
                  setError(null);
                }}
                placeholder="johndoe"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={username}
              />
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                3-15 characters. Letters, numbers, and underscores.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.secondaryForeground }]}>
                Display name
              </Text>
              <TextInput
                editable={!isSubmitting}
                maxLength={50}
                onChangeText={(value) => {
                  setDisplayName(value);
                  setError(null);
                }}
                placeholder="John Doe"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={displayName}
              />
            </View>

            {error ? (
              <Text
                style={[
                  styles.error,
                  {
                    backgroundColor: colors.destructiveMuted,
                    borderColor: colors.destructive,
                    color: colors.destructive,
                  },
                ]}
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && !isSubmitting ? styles.buttonPressed : null,
                isSubmitting ? styles.buttonDisabled : null,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  Create profile
                </Text>
              )}
            </Pressable>

            <Pressable disabled={isSubmitting} onPress={handleSignOut} style={styles.secondaryButton}>
              <Text style={[styles.secondaryButtonText, { color: colors.mutedForeground }]}>
                Sign out
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getProfileErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("USERNAME_TAKEN:")) {
    return "Username already taken. Please try a different one.";
  }
  if (message.includes("USERNAME_RESERVED:")) {
    return "This username is reserved. Please choose another one.";
  }
  if (message.includes("USERNAME_TOO_SHORT:")) {
    return "Username is too short.";
  }
  if (message.includes("USERNAME_TOO_LONG:")) {
    return "Username is too long.";
  }
  if (message.includes("USERNAME_INVALID_CHARS:")) {
    return "Username can only use letters, numbers, and underscores.";
  }
  if (message.includes("PROFILE_EXISTS:")) {
    return "Profile already exists. Please sign in again.";
  }

  return message || "Failed to create profile.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 28,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
