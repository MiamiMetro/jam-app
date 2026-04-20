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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { authClient } from "../../lib/auth-client";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const LoginScreen = ({ navigation }: Props) => {
  const { colors } = useMobileTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Login failed.");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Login failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.success }]}>Jam</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              Sign in to continue making music.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.secondaryForeground }]}>
                Email
              </Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                }}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.secondaryForeground }]}>
                Password
              </Text>
              <TextInput
                autoComplete="password"
                editable={!isSubmitting}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={password}
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
              onPress={handleLogin}
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
                  Login
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={isSubmitting}
              onPress={() => navigation.navigate("Register")}
              style={styles.secondaryButton}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.mutedForeground }]}>
                Don't have an account? Sign up
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
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
    marginBottom: 32,
  },
  kicker: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 23,
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
