import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  children: ReactNode;
};

export default function ActionBar({ children }: Props) {
  const { recipes } = useMobileTheme();
  return <View style={[recipes.actionBar, styles.container]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexWrap: "wrap",
  },
});
