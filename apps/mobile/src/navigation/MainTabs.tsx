import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import ProfileScreen from "../screens/Profile/ProfileScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import JamScreen from "../screens/Jams/JamScreen";
import MessagesScreen from "../screens/Messages/MessagesScreen";
import MoreScreen from "../screens/More/MoreScreen";
import { useMobileTheme } from "../theme/MobileTheme";

type MainTabParamList = {
  Jams: undefined;
  Feed: undefined;
  Messages: undefined;
  Profile: undefined;
  More: undefined;
};

type IconName = keyof typeof Ionicons.glyphMap;

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, { focused: IconName; idle: IconName }> = {
  Jams: {
    focused: "musical-notes",
    idle: "musical-notes-outline",
  },
  Feed: {
    focused: "radio",
    idle: "radio-outline",
  },
  Messages: {
    focused: "chatbubble-ellipses",
    idle: "chatbubble-ellipses-outline",
  },
  Profile: {
    focused: "person",
    idle: "person-outline",
  },
  More: {
    focused: "ellipsis-horizontal-circle",
    idle: "ellipsis-horizontal-circle-outline",
  },
};

const MainTabs = () => {
  const { colors } = useMobileTheme();

  return (
    <Tab.Navigator
      initialRouteName="Jams"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused, color, size }) => (
          <View
            style={[
              styles.iconWrap,
              focused ? { backgroundColor: colors.accentMuted } : null,
            ]}
          >
            <Ionicons
              color={color}
              name={focused ? icons[route.name].focused : icons[route.name].idle}
              size={Math.max(20, size - 2)}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Jams" component={JamScreen} />
      <Tab.Screen name="Feed" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    elevation: 0,
    height: 66,
    paddingBottom: 8,
    paddingTop: 7,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  tabItem: {
    borderRadius: 8,
    marginHorizontal: 4,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    minWidth: 42,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
