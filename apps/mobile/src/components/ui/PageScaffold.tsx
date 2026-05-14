import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  bottomInset?: boolean;
  children: ReactNode;
  style?: ViewStyle;
  topInset?: boolean;
};

export default function PageScaffold({
  bottomInset = false,
  children,
  style,
  topInset = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useMobileTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingBottom: bottomInset ? insets.bottom : 0,
          paddingTop: topInset ? insets.top : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
