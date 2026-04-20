import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  buttonLabel?: string;
  initialValue?: string;
  isSubmitting?: boolean;
  onSubmit: (text: string) => Promise<void>;
  placeholder: string;
};

const MAX_COMMENT_LENGTH = 1000;

export default function CommentComposer({
  buttonLabel = "Comment",
  initialValue = "",
  isSubmitting = false,
  onSubmit,
  placeholder,
}: Props) {
  const { colors } = useMobileTheme();
  const [text, setText] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const trimmedText = text.trim();
  const canSubmit = trimmedText.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setError(null);
      await onSubmit(trimmedText);
      setText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to send comment.");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TextInput
        editable={!isSubmitting}
        maxLength={MAX_COMMENT_LENGTH}
        multiline
        onChangeText={(value) => {
          setText(value);
          setError(null);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            borderColor: colors.borderStrong,
            color: colors.foreground,
          },
        ]}
        textAlignVertical="top"
        value={text}
      />

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

      <View style={styles.footer}>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>
          {text.length}/{MAX_COMMENT_LENGTH}
        </Text>
        <Pressable
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: canSubmit ? colors.primary : colors.muted },
            pressed && canSubmit ? styles.buttonPressed : null,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: canSubmit ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {buttonLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  counter: {
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 34,
    justifyContent: "center",
    minWidth: 92,
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
