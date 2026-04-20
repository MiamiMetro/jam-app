import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useMobileTheme,
  type MobileThemeMode,
} from "@/theme/MobileTheme";

const themeOptions: Array<{
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: MobileThemeMode;
}> = [
  {
    description: "Match this phone.",
    icon: "phone-portrait-outline",
    label: "System",
    value: "system",
  },
  {
    description: "Warm studio daylight.",
    icon: "sunny-outline",
    label: "Light",
    value: "light",
  },
  {
    description: "Low-light studio.",
    icon: "moon-outline",
    label: "Dark",
    value: "dark",
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { colors, resolvedTheme, setTheme, theme } = useMobileTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? colors.cardPressed : "transparent" },
          ]}
        >
          <Ionicons color={colors.foreground} name="chevron-back" size={22} />
        </Pressable>
        <View>
          <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>
            Settings
          </Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Preferences
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: colors.background }}
      >
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Theme
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Choose your look
          </Text>
          <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
            Current appearance: {resolvedTheme}
          </Text>

          <View style={styles.optionList}>
            {themeOptions.map((option) => {
              const selected = theme === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setTheme(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: selected
                        ? colors.accentMuted
                        : pressed
                          ? colors.cardPressed
                          : colors.input,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : colors.secondary,
                      },
                    ]}
                  >
                    <Ionicons
                      color={
                        selected
                          ? colors.primaryForeground
                          : colors.secondaryForeground
                      }
                      name={option.icon}
                      size={18}
                    />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    color={selected ? colors.primary : colors.mutedForeground}
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    marginRight: 10,
    width: 38,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  option: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
  },
  optionDescription: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 2,
  },
  optionIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  optionList: {
    gap: 10,
    marginTop: 16,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 6,
  },
});
