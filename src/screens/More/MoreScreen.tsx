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

export default function MoreScreen() {
  const navigation = useNavigation<any>();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>More</Text>
        <Text style={styles.headerTitle}>Your spaces</Text>
      </View>

      <View style={styles.menu}>
        <Pressable
          onPress={openMyMusic}
          style={({ pressed }) => [
            styles.menuItem,
            pressed ? styles.menuItemPressed : null,
          ]}
        >
          <View style={styles.menuIcon}>
            <Ionicons color="#D8A64A" name="musical-notes" size={20} />
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuTitle}>My Music</Text>
            <Text style={styles.menuSubtitle}>Upload tracks and keep your library close.</Text>
          </View>
          <Ionicons color="#8F98A8" name="chevron-forward" size={20} />
        </Pressable>

        <Pressable
          onPress={() => openRootScreen("Communities")}
          style={({ pressed }) => [
            styles.menuItem,
            pressed ? styles.menuItemPressed : null,
          ]}
        >
          <View style={styles.menuIcon}>
            <Ionicons color="#D8A64A" name="people" size={20} />
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuTitle}>Communities</Text>
            <Text style={styles.menuSubtitle}>Find scenes, join conversations, and start one.</Text>
          </View>
          <Ionicons color="#8F98A8" name="chevron-forward" size={20} />
        </Pressable>

        <Pressable
          onPress={() => openRootScreen("Bands")}
          style={({ pressed }) => [
            styles.menuItem,
            pressed ? styles.menuItemPressed : null,
          ]}
        >
          <View style={styles.menuIcon}>
            <Ionicons color="#D8A64A" name="people-circle" size={20} />
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuTitle}>Bands</Text>
            <Text style={styles.menuSubtitle}>Post openings, apply, and review musicians.</Text>
          </View>
          <Ionicons color="#8F98A8" name="chevron-forward" size={20} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1A1E29",
    flex: 1,
  },
  header: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerEyebrow: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#EEF0F5",
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
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemPressed: {
    backgroundColor: "#2C3240",
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: "rgba(216,166,74,0.12)",
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
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
  },
  menuSubtitle: {
    color: "#8F98A8",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },
});
