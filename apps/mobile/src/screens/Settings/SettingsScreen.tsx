import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useMobileTheme,
  type MobileThemeMode,
} from "@/theme/MobileTheme";
import { authClient } from "@/lib/auth-client";
import { LEGAL_LINKS } from "@/lib/legal";
import { useSoftDeleteProfile } from "@/hooks/useUsers";

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
  const insets = useSafeAreaInsets();
  const softDeleteProfile = useSoftDeleteProfile();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "Your login will be removed and public identity anonymized. Some content may remain without profile details.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await softDeleteProfile.mutateAsync();
            await authClient.deleteUser();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? colors.cardPressed : "transparent" },
          ]}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.foreground}
            importantForAccessibility="no-hide-descendants"
            name="chevron-back"
            size={22}
          />
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
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
                  accessibilityLabel={`Set theme to ${option.label}. ${option.description}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
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
                      accessibilityElementsHidden
                      color={
                        selected
                          ? colors.primaryForeground
                          : colors.secondaryForeground
                      }
                      importantForAccessibility="no-hide-descendants"
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
                    accessibilityElementsHidden
                    color={selected ? colors.primary : colors.mutedForeground}
                    importantForAccessibility="no-hide-descendants"
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

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
            Legal
          </Text>
          <View style={styles.linkList}>
            {[
              ["Terms of Service", LEGAL_LINKS.terms],
              ["Privacy Policy", LEGAL_LINKS.privacy],
              ["KVKK Notice", LEGAL_LINKS.kvkk],
              ["Privacy Choices", LEGAL_LINKS.privacyChoices],
              ["Contact & Report Abuse", LEGAL_LINKS.support],
              ["Open Source Licenses", LEGAL_LINKS.openSource],
            ].map(([label, url]) => (
              <Pressable
                accessibilityLabel={`Open ${label}`}
                accessibilityRole="link"
                key={label}
                onPress={() => Linking.openURL(url)}
                style={({ pressed }) => [
                  styles.legalLink,
                  {
                    backgroundColor: pressed ? colors.cardPressed : colors.input,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.legalLinkText, { color: colors.foreground }]}>
                  {label}
                </Text>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.mutedForeground}
                  importantForAccessibility="no-hide-descendants"
                  name="open-outline"
                  size={17}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.destructive,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.destructive }]}>
            Account
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Delete account
          </Text>
          <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
            Removes your login and anonymizes your public identity. Some posts and messages may remain without your profile details.
          </Text>
          <Pressable
            accessibilityLabel="Delete account"
            accessibilityRole="button"
            onPress={handleDeleteAccount}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.destructive },
              pressed ? { opacity: 0.8 } : null,
            ]}
          >
            <Text style={[styles.deleteButtonText, { color: colors.primaryForeground }]}>
              Delete Account
            </Text>
          </Pressable>
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
  deleteButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 46,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  legalLink: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  legalLinkText: {
    fontSize: 14,
    fontWeight: "800",
  },
  linkList: {
    gap: 9,
    marginTop: 14,
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
