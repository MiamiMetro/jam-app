import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { User } from "@/types";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  profile: User;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
};

export default function ProfileHeader({ profile, onOpenSettings, onSignOut }: Props) {
  const { colors } = useMobileTheme();
  const hasAvatar = Boolean(profile.avatar_url);
  const fallbackLetter = (profile.display_name || profile.username || "?")
    .slice(0, 1)
    .toUpperCase();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={styles.headerActions}>
          {onOpenSettings ? (
            <Pressable
              accessibilityLabel="Settings"
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: pressed ? colors.cardPressed : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons color={colors.secondaryForeground} name="settings-outline" size={17} />
            </Pressable>
          ) : null}
          {onSignOut ? (
            <Pressable
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  backgroundColor: pressed ? colors.cardPressed : "transparent",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.signOutText, { color: colors.secondaryForeground }]}>
                Sign out
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.avatarWrapper}>
        {hasAvatar ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.avatarFallbackText, { color: colors.foreground }]}>
              {fallbackLetter}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.displayName, { color: colors.foreground }]}>
        {profile.display_name || "No display name"}
      </Text>
      <Text style={[styles.username, { color: colors.mutedForeground }]}>
        @{profile.username}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  signOutButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "700",
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatar: {
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  avatarFallback: {
    alignItems: "center",
    borderRadius: 44,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  avatarFallbackText: {
    fontSize: 30,
    fontWeight: "700",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: "500",
  },
});
