import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
};

export default function FilterPill({ children, onPress, selected = false }: Props) {
  const { colors, recipes } = useMobileTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        recipes.filterPill,
        {
          backgroundColor: selected ? colors.accentMuted : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? colors.primary : colors.mutedForeground },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: "800",
  },
});
