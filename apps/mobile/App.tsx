import React, { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import RootNavigator from "./src/navigation/RootNavigator";
import { authClient } from "./src/lib/auth-client";
import {
  MobileThemeProvider,
  useMobileTheme,
} from "./src/theme/MobileTheme";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  expectAuth: true,
  unsavedChangesWarning: false,
});

const App = () => {
  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      console.warn("Failed to configure audio mode", error);
    });
  }, []);

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <MobileThemeProvider>
        <ThemedNavigation />
      </MobileThemeProvider>
    </ConvexBetterAuthProvider>
  );
};

function ThemedNavigation() {
  const { colors, resolvedTheme } = useMobileTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch((error) => {
      console.warn("Failed to update system UI background", error);
    });
  }, [colors.background]);

  const navigationTheme = {
    ...(resolvedTheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedTheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      border: colors.border,
      card: colors.card,
      notification: colors.primary,
      primary: colors.primary,
      text: colors.foreground,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar
        backgroundColor={colors.background}
        style={resolvedTheme === "dark" ? "light" : "dark"}
      />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default App;
