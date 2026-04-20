import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useConvexAuth, useQuery } from "convex/react";

import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import ProfileSetupScreen from "../screens/Auth/ProfileSetupScreen";
import PostDetailScreen from "../screens/Posts/PostDetailScreen";
import ConversationScreen from "../screens/Messages/ConversationScreen";
import JamRoomScreen from "../screens/Jams/JamRoomScreen";
import MyMusicScreen from "../screens/Music/MyMusicScreen";
import CommunityScreen from "../screens/Community/CommunityScreen";
import CommunityDetailScreen from "../screens/Community/CommunityDetailScreen";
import BandsScreen from "../screens/Bands/BandsScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";
import { authClient } from "../lib/auth-client";
import { api } from "@jam-app/convex";
import { useMobileTheme } from "../theme/MobileTheme";

export type RootStackParamList = {
  Auth: undefined;
  ProfileSetup: undefined;
  Main: undefined;
  PostDetail: { postId: string };
  Conversation: { conversationId: string; title?: string };
  JamRoom: { handle: string };
  MyMusic: undefined;
  Communities: undefined;
  CommunityDetail: { handle: string };
  Bands: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const hasSession = Boolean(session?.session);
  const canLoadProfile = hasSession && !isConvexAuthLoading && isAuthenticated;
  const profile = useQuery(api.profiles.getMe, canLoadProfile ? {} : "skip");

  if (
    isSessionPending ||
    (hasSession && (isConvexAuthLoading || !isAuthenticated)) ||
    (canLoadProfile && profile === undefined)
  ) {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasSession ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : profile ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="JamRoom" component={JamRoomScreen} />
          <Stack.Screen name="MyMusic" component={MyMusicScreen} />
          <Stack.Screen name="Communities" component={CommunityScreen} />
          <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
          <Stack.Screen name="Bands" component={BandsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      )}
    </Stack.Navigator>
  );
}

function AuthLoadingScreen() {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
        Session is loading...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    textAlign: "center",
  },
});
