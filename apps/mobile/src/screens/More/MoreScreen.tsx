import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/MobileTheme";
import ListRow from "@/components/ui/ListRow";

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const openRootScreen = (screen: string) => {
    const rootNavigation = navigation.getParent?.();
    if (rootNavigation) {
      rootNavigation.navigate(screen);
      return;
    }
    navigation.navigate(screen);
  };
  const openMyMusic = () => {
    openRootScreen("MyMusic");
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>
          Explore
        </Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Music, scenes, and bands
        </Text>
      </View>

      <View style={[styles.menu, { borderTopColor: colors.border }]}>
        <ListRow
          accessibilityLabel="Open My Music"
          leading={
          <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons color={colors.primary} name="musical-notes" size={20} />
          </View>
          }
          onPress={openMyMusic}
          subtitle="My Library and Upload, matching the desktop music surface."
          title="My Music"
          trailing={<Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />}
        />

        <ListRow
          accessibilityLabel="Open Communities"
          leading={
          <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons color={colors.primary} name="people" size={20} />
          </View>
          }
          onPress={() => openRootScreen("Communities")}
          subtitle="Discover scenes, create spaces, and manage memberships."
          title="Communities"
          trailing={<Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />}
        />

        <ListRow
          accessibilityLabel="Open Bands"
          leading={
          <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons color={colors.primary} name="people-circle" size={20} />
          </View>
          }
          onPress={() => openRootScreen("Bands")}
          subtitle="Browse listings, apply, and manage band activity."
          title="Bands"
          trailing={<Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />}
        />

        <ListRow
          accessibilityLabel="Open Settings"
          leading={
            <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
              <Ionicons color={colors.primary} name="settings-outline" size={20} />
            </View>
          }
          onPress={() => openRootScreen("Settings")}
          subtitle="Theme, account, and app preferences."
          title="Settings"
          trailing={<Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
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
    marginTop: 6,
  },
  menu: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  menuIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
});
