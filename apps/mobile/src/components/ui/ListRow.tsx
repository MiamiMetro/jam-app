import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  accessibilityLabel?: string;
  leading?: ReactNode;
  meta?: string;
  onPress?: () => void;
  selected?: boolean;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
};

export default function ListRow({
  accessibilityLabel,
  leading,
  meta,
  onPress,
  selected = false,
  subtitle,
  title,
  trailing,
}: Props) {
  const { colors, recipes } = useMobileTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        recipes.listRow,
        selected ? { borderLeftColor: colors.primary, borderLeftWidth: 2 } : null,
        pressed ? { backgroundColor: colors.cardPressed } : null,
      ]}
    >
      {leading}
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {meta}
            </Text>
          ) : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  meta: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
});
