import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = ComponentProps<typeof TextInput> & {
  error?: string | null;
  hint?: string;
  label: string;
};

export default function FormField({ error, hint, label, style, ...inputProps }: Props) {
  const { colors, recipes } = useMobileTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.secondaryForeground }]}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[recipes.formInput, styles.input, style]}
        {...inputProps}
      />
      {error ? (
        <Text selectable style={[styles.feedback, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.feedback, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  feedback: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  input: {
    fontSize: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
  },
});
