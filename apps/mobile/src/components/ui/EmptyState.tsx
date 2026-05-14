import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  title: string;
};

export default function EmptyState({ icon = "musical-notes-outline", message, title }: Props) {
  const { colors } = useMobileTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.accentMuted }]}>
        <Ionicons color={colors.primary} name={icon} size={26} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
});
