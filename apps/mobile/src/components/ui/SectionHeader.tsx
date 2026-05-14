import { StyleSheet, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  meta?: string;
  title: string;
};

export default function SectionHeader({ meta, title }: Props) {
  const { colors } = useMobileTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>
        {title}
      </Text>
      {meta ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
