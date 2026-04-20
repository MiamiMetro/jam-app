import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>
          More
        </Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Your spaces
        </Text>
      </View>

      <View style={styles.menu}>
        <Pressable
          onPress={openMyMusic}
          style={({ pressed }) => [
            styles.menuItem,
            {
              backgroundColor: pressed ? colors.cardPressed : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons color={colors.primary} name="musical-notes" size={20} />
          </View>
          <View style={styles.menuBody}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>My Music</Text>
            <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>
              Upload tracks and keep your library close.
            </Text>
          </View>
          <Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />
        </Pressable>

        <Pressable
          onPress={() => openRootScreen("Communities")}
          style={({ pressed }) => [
            styles.menuItem,
            {
              backgroundColor: pressed ? colors.cardPressed : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons color={colors.primary} name="people" size={20} />
          </View>
          <View style={styles.menuBody}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>
              Communities
            </Text>
            <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>
              Find scenes, join conversations, and start one.
            </Text>
          </View>
          <Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />
        </Pressable>

        <Pressable
          onPress={() => openRootScreen("Bands")}
          style={({ pressed }) => [
            styles.menuItem,
            {
              backgroundColor: pressed ? colors.cardPressed : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons color={colors.primary} name="people-circle" size={20} />
          </View>
          <View style={styles.menuBody}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>Bands</Text>
            <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>
              Post openings, apply, and review musicians.
            </Text>
          </View>
          <Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />
        </Pressable>
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
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  menuItem: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  menuBody: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },
});
