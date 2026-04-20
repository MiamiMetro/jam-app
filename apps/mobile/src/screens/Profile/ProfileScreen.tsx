import React from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ProfileHeader from "@/components/profile/ProfileHeader";
import PostList from "@/components/posts/PostList";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useProfilePosts } from "@/hooks/useProfilePosts";
import { authClient } from "@/lib/auth-client";
import { useMobileTheme } from "@/theme/MobileTheme";

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const { profile, isLoading: isProfileLoading } = useMyProfile();
  const { posts, isLoading, isLoadingMore, canLoadMore, loadMore } = useProfilePosts(
    profile?.username
  );

  if (isProfileLoading) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
          Profile is loading...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
          No profile found.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ProfileHeader
        profile={profile}
        onOpenSettings={() => navigation.navigate("Settings")}
        onSignOut={() => authClient.signOut()}
      />
      <PostList
        posts={posts}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onEndReached={() => {
          if (canLoadMore && !isLoadingMore) {
            loadMore(10);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
  },
});
