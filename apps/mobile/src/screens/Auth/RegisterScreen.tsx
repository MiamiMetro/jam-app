import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { authClient } from "../../lib/auth-client";
import { useMobileTheme } from "@/theme/MobileTheme";
import FormField from "@/components/ui/FormField";
import { LEGAL_LINKS } from "@/lib/legal";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const RegisterScreen = ({ navigation }: Props) => {
  const { colors } = useMobileTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!acceptedLegal) {
      setError("Accept the Terms, Privacy Policy, and KVKK notice to continue.");
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.success }]}>Jam</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Join the session
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              Create your account, then choose your stage name.
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              placeholder="your@email.com"
              textContentType="emailAddress"
              value={email}
            />

            <FormField
              autoComplete="new-password"
              editable={!isSubmitting}
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
                setError(null);
              }}
              placeholder="Password"
              secureTextEntry
              textContentType="newPassword"
              value={password}
            />

            <FormField
              autoComplete="new-password"
              editable={!isSubmitting}
              label="Confirm password"
              onChangeText={(value) => {
                setConfirmPassword(value);
                setError(null);
              }}
              placeholder="Password"
              secureTextEntry
              textContentType="newPassword"
              value={confirmPassword}
            />

            {error ? (
              <Text
                selectable
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
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedLegal }}
              disabled={isSubmitting}
              onPress={() => {
                setAcceptedLegal((value) => !value);
                setError(null);
              }}
              style={styles.legalRow}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: acceptedLegal ? colors.primary : colors.input,
                    borderColor: acceptedLegal ? colors.primary : colors.border,
                  },
                ]}
              >
                {acceptedLegal ? (
                  <Text style={[styles.checkmark, { color: colors.primaryForeground }]}>✓</Text>
                ) : null}
              </View>
              <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
                I agree to Jam's{" "}
                <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>
                  Terms
                </Text>
                ,{" "}
                <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>
                  Privacy Policy
                </Text>
                , and{" "}
                <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(LEGAL_LINKS.kvkk)}>
                  KVKK notice
                </Text>
                .
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create account"
              disabled={isSubmitting}
              onPress={handleRegister}
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
                  Create account
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to login"
              disabled={isSubmitting}
              onPress={() => navigation.navigate("Login")}
              style={styles.secondaryButton}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.mutedForeground }]}>
                Already have an account? Login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
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
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
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
  checkbox: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    marginTop: 1,
    width: 20,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  legalRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  legalText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
});
