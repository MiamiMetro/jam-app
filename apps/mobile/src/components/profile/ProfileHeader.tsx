import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { User } from "@/types";
import { useMobileTheme } from "@/theme/MobileTheme";
import Surface from "@/components/ui/Surface";
import { getNativeAvatarUri } from "@/utils/avatar";

type Props = {
  profile: User;
  onSignOut?: () => void;
};

export default function ProfileHeader({ profile, onSignOut }: Props) {
  const { colors } = useMobileTheme();
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false);
  const avatarUri = getNativeAvatarUri(profile.avatar_url);
  const showAvatarImage = Boolean(avatarUri) && !avatarLoadFailed;
  const fallbackLetter = (profile.display_name || profile.username || "?")
    .slice(0, 1)
    .toUpperCase();

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUri]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>Account</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        </View>
        <View style={styles.headerActions}>
          {onSignOut ? (
            <Pressable
              accessibilityLabel="Sign out"
              accessibilityRole="button"
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

      <Surface variant="hero" style={styles.profileHero}>
        <View style={styles.profileHeroRow}>
          <View style={styles.avatarWrapper}>
            {showAvatarImage ? (
              <Image
                onError={() => setAvatarLoadFailed(true)}
                source={{ uri: avatarUri }}
                style={[
                  styles.avatar,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.avatarFallbackText, { color: colors.foreground }]}>
                  {fallbackLetter}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.identity}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {profile.display_name || profile.username}
            </Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>
              @{profile.username}
            </Text>
            <View style={styles.statsRow}>
              <View style={[styles.statPill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.statText, { color: colors.secondaryForeground }]}>
                  Profile
                </Text>
              </View>
            </View>
            {profile.bio ? (
              <Text numberOfLines={3} style={[styles.bio, { color: colors.secondaryForeground }]}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
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
    flexShrink: 0,
  },
  avatar: {
    borderRadius: 52,
    borderWidth: 1,
    height: 104,
    width: 104,
  },
  bio: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 8,
  },
  avatarFallback: {
    alignItems: "center",
    borderRadius: 52,
    borderWidth: 1,
    height: 104,
    justifyContent: "center",
    width: 104,
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: "900",
  },
  displayName: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  profileHero: {
    padding: 16,
  },
  profileHeroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  statPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statsRow: {
    flexDirection: "row",
  },
  statText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  username: {
    fontSize: 15,
    fontWeight: "500",
  },
});
