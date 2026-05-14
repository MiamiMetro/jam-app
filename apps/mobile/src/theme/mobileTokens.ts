import type { ViewStyle } from "react-native";

export type MobileThemePalette = {
  accent: string;
  accentForeground: string;
  accentMuted: string;
  background: string;
  border: string;
  borderStrong: string;
  card: string;
  cardForeground: string;
  cardPressed: string;
  destructive: string;
  destructiveMuted: string;
  foreground: string;
  input: string;
  muted: string;
  mutedForeground: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  ring: string;
  secondary: string;
  secondaryForeground: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
};

export type MobileThemeRadii = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
};

export type MobileThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

export type MobileThemeRecipes = {
  actionBar: ViewStyle;
  filterPill: ViewStyle;
  formInput: ViewStyle;
  heroCard: ViewStyle;
  listRow: ViewStyle;
  surface: ViewStyle;
  surfaceStrong: ViewStyle;
};

export const mobileRadii: MobileThemeRadii = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 999,
};

export const mobileSpacing: MobileThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const darkMobileColors: MobileThemePalette = {
  accent: "#D8A64A",
  accentForeground: "#251B0A",
  accentMuted: "rgba(216,166,74,0.14)",
  background: "#1A1E29",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  card: "#262B37",
  cardForeground: "#EEF0F5",
  cardPressed: "#2C3240",
  destructive: "#FECACA",
  destructiveMuted: "rgba(248,113,113,0.14)",
  foreground: "#EEF0F5",
  input: "#1E2330",
  muted: "#353B49",
  mutedForeground: "#8F98A8",
  popover: "#262B37",
  primary: "#D8A64A",
  primaryForeground: "#251B0A",
  ring: "rgba(216,166,74,0.4)",
  secondary: "#353B49",
  secondaryForeground: "#D5D9E2",
  success: "#8BE0AD",
  successMuted: "rgba(79,180,119,0.16)",
  warning: "#FBBF24",
  warningMuted: "rgba(251,191,36,0.16)",
};

export const lightMobileColors: MobileThemePalette = {
  accent: "#C55A18",
  accentForeground: "#FFF8ED",
  accentMuted: "rgba(197,90,24,0.12)",
  background: "#F3F0E8",
  border: "#D9D0C0",
  borderStrong: "#CFC4B1",
  card: "#FBFAF6",
  cardForeground: "#332A20",
  cardPressed: "#EFE8DA",
  destructive: "#B42318",
  destructiveMuted: "rgba(180,35,24,0.1)",
  foreground: "#332A20",
  input: "#E6DDCE",
  muted: "#EDE6D8",
  mutedForeground: "#766B5F",
  popover: "#FBFAF6",
  primary: "#C55A18",
  primaryForeground: "#FFF8ED",
  ring: "rgba(197,90,24,0.4)",
  secondary: "#EDE6D8",
  secondaryForeground: "#3E3328",
  success: "#248A4C",
  successMuted: "rgba(36,138,76,0.12)",
  warning: "#A16207",
  warningMuted: "rgba(161,98,7,0.12)",
};

export function createMobileRecipes(colors: MobileThemePalette): MobileThemeRecipes {
  return {
    actionBar: {
      alignItems: "center",
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: mobileSpacing.xl,
      paddingTop: mobileSpacing.md,
    },
    filterPill: {
      alignItems: "center",
      borderRadius: mobileRadii.pill,
      borderWidth: 1,
      minHeight: 34,
      paddingHorizontal: mobileSpacing.md,
    },
    formInput: {
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderRadius: mobileRadii.md,
      borderWidth: 1,
      minHeight: 44,
      paddingHorizontal: mobileSpacing.md,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderColor: colors.borderStrong,
      borderRadius: mobileRadii.xl,
      borderWidth: 1,
      overflow: "hidden",
      padding: mobileSpacing.lg,
    },
    listRow: {
      alignItems: "center",
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: mobileSpacing.md,
      minHeight: 68,
      paddingHorizontal: mobileSpacing.lg,
      paddingVertical: mobileSpacing.md,
    },
    surface: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: mobileRadii.lg,
      borderWidth: 1,
    },
    surfaceStrong: {
      backgroundColor: colors.card,
      borderColor: colors.borderStrong,
      borderRadius: mobileRadii.lg,
      borderWidth: 1,
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.10)",
    },
  };
}
