import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type MobileThemeMode = "light" | "dark" | "system";
export type ResolvedMobileTheme = "light" | "dark";

export type MobileThemeColors = {
  accent: string;
  accentMuted: string;
  background: string;
  border: string;
  borderStrong: string;
  card: string;
  cardPressed: string;
  destructive: string;
  destructiveMuted: string;
  foreground: string;
  input: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  success: string;
};

type MobileThemeContextValue = {
  colors: MobileThemeColors;
  resolvedTheme: ResolvedMobileTheme;
  setTheme: (theme: MobileThemeMode) => void;
  theme: MobileThemeMode;
};

const THEME_STORAGE_KEY = "mobile-theme";

const darkColors: MobileThemeColors = {
  accent: "#D8A64A",
  accentMuted: "rgba(216,166,74,0.14)",
  background: "#1A1E29",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  card: "#262B37",
  cardPressed: "#2C3240",
  destructive: "#FECACA",
  destructiveMuted: "rgba(248,113,113,0.14)",
  foreground: "#EEF0F5",
  input: "#1E2330",
  muted: "#353B49",
  mutedForeground: "#8F98A8",
  primary: "#D8A64A",
  primaryForeground: "#251B0A",
  secondary: "#353B49",
  secondaryForeground: "#D5D9E2",
  success: "#8BE0AD",
};

const lightColors: MobileThemeColors = {
  accent: "#C55A18",
  accentMuted: "rgba(197,90,24,0.12)",
  background: "#F3F0E8",
  border: "#D9D0C0",
  borderStrong: "#CFC4B1",
  card: "#FBFAF6",
  cardPressed: "#EFE8DA",
  destructive: "#B42318",
  destructiveMuted: "rgba(180,35,24,0.1)",
  foreground: "#332A20",
  input: "#E6DDCE",
  muted: "#EDE6D8",
  mutedForeground: "#766B5F",
  primary: "#C55A18",
  primaryForeground: "#FFF8ED",
  secondary: "#EDE6D8",
  secondaryForeground: "#3E3328",
  success: "#248A4C",
};

const MobileThemeContext = createContext<MobileThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is MobileThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<MobileThemeMode>("system");

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (mounted && isThemeMode(storedTheme)) {
          setThemeState(storedTheme);
        }
      })
      .catch((error) => {
        console.warn("Failed to load theme", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedTheme: ResolvedMobileTheme =
    theme === "system"
      ? systemScheme === "light"
        ? "light"
        : "dark"
      : theme;

  const colors = resolvedTheme === "light" ? lightColors : darkColors;

  const value = useMemo<MobileThemeContextValue>(
    () => ({
      colors,
      resolvedTheme,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
        SecureStore.setItemAsync(THEME_STORAGE_KEY, nextTheme).catch((error) => {
          console.warn("Failed to save theme", error);
        });
      },
      theme,
    }),
    [colors, resolvedTheme, theme]
  );

  return (
    <MobileThemeContext.Provider value={value}>
      {children}
    </MobileThemeContext.Provider>
  );
}

export function useMobileTheme() {
  const context = useContext(MobileThemeContext);
  if (!context) {
    throw new Error("useMobileTheme must be used within MobileThemeProvider");
  }
  return context;
}
