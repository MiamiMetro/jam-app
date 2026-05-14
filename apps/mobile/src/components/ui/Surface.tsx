import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Variant = "default" | "strong" | "hero";

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: Variant;
};

export default function Surface({ children, style, variant = "default" }: Props) {
  const { recipes } = useMobileTheme();
  const baseStyle =
    variant === "hero"
      ? recipes.heroCard
      : variant === "strong"
        ? recipes.surfaceStrong
        : recipes.surface;

  return <View style={[baseStyle, style]}>{children}</View>;
}
