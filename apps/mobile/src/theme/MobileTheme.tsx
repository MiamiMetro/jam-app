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
import {
  createMobileRecipes,
  darkMobileColors,
  lightMobileColors,
  mobileRadii,
  mobileSpacing,
  type MobileThemePalette,
  type MobileThemeRadii,
  type MobileThemeRecipes,
  type MobileThemeSpacing,
} from "./mobileTokens";

export type MobileThemeMode = "light" | "dark" | "system";
export type ResolvedMobileTheme = "light" | "dark";

export type MobileThemeColors = MobileThemePalette;

type MobileThemeContextValue = {
  colors: MobileThemeColors;
  radii: MobileThemeRadii;
  recipes: MobileThemeRecipes;
  resolvedTheme: ResolvedMobileTheme;
  setTheme: (theme: MobileThemeMode) => void;
  spacing: MobileThemeSpacing;
  theme: MobileThemeMode;
};

const THEME_STORAGE_KEY = "mobile-theme";

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

  const colors = resolvedTheme === "light" ? lightMobileColors : darkMobileColors;
  const recipes = useMemo(() => createMobileRecipes(colors), [colors]);

  const value = useMemo<MobileThemeContextValue>(
    () => ({
      colors,
      radii: mobileRadii,
      recipes,
      resolvedTheme,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
        SecureStore.setItemAsync(THEME_STORAGE_KEY, nextTheme).catch((error) => {
          console.warn("Failed to save theme", error);
        });
      },
      spacing: mobileSpacing,
      theme,
    }),
    [colors, recipes, resolvedTheme, theme]
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
