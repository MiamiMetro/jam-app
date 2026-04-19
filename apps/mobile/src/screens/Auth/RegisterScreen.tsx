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

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const RegisterScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: email.trim(),
      });

      if (result.error) {
        throw new Error(result.error.message || "Registration failed.");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Registration failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Jam</Text>
            <Text style={styles.title}>Join the session</Text>
            <Text style={styles.description}>
              Create your account, then choose your stage name.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
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
                placeholderTextColor="#6B7280"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoComplete="new-password"
                editable={!isSubmitting}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                placeholder="Password"
                placeholderTextColor="#6B7280"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                autoComplete="new-password"
                editable={!isSubmitting}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setError(null);
                }}
                placeholder="Password"
                placeholderTextColor="#6B7280"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={isSubmitting}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isSubmitting ? styles.buttonPressed : null,
                isSubmitting ? styles.buttonDisabled : null,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#030712" />
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </Pressable>

            <Pressable
              disabled={isSubmitting}
              onPress={() => navigation.navigate("Login")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Already have an account? Login
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#030712",
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
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    color: "#F9FAFB",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 12,
  },
  description: {
    color: "#9CA3AF",
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
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderRadius: 8,
    borderWidth: 1,
    color: "#F9FAFB",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  error: {
    backgroundColor: "#7F1D1D",
    borderColor: "#991B1B",
    borderRadius: 8,
    borderWidth: 1,
    color: "#FEE2E2",
    padding: 12,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#A7F3D0",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#030712",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#9CA3AF",
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
