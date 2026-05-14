import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import ProfileHeader from "@/components/profile/ProfileHeader";
import PostList from "@/components/posts/PostList";
import { useProfilePosts } from "@/hooks/useProfilePosts";
import { useBlockUser, useIsBlockedByMe, useUnblockUser, useUser } from "@/hooks/useUsers";
import { useReportContent } from "@/hooks/usePosts";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export default function PublicProfileScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const { colors } = useMobileTheme();
  const { data: profile, isLoading: isProfileLoading } = useUser(username);
  const reportContent = useReportContent();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: isBlockedByMe } = useIsBlockedByMe(profile?.id);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const { posts, isLoading, isLoadingMore, canLoadMore, loadMore } =
    useProfilePosts(username);

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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed ? colors.cardPressed : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons color={colors.secondaryForeground} name="arrow-back" size={20} />
          </Pressable>
        </View>
        <View style={styles.centerState}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Profile not found
          </Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            This profile may be unavailable or no longer discoverable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleReport = async () => {
    Alert.alert("Report profile", `Send @${profile.username}'s profile to Jam for review?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          await reportContent.mutateAsync({
            targetType: "profile",
            targetId: profile.id,
            reason: "other",
          });
          setReportSubmitted(true);
          setTimeout(() => setReportSubmitted(false), 1000);
        },
      },
    ]);
  };

  const handleBlock = async () => {
    await blockUser.mutateAsync(profile.id);
  };

  const handleUnblock = async () => {
    await unblockUser.mutateAsync(profile.id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? colors.cardPressed : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons color={colors.secondaryForeground} name="arrow-back" size={20} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Report profile"
            accessibilityRole="button"
            onPress={handleReport}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed ? colors.cardPressed : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={reportSubmitted ? colors.success : colors.mutedForeground}
              name={reportSubmitted ? "checkmark" : "flag-outline"}
              size={18}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={isBlockedByMe ? "Unblock user" : "Block user"}
            accessibilityRole="button"
            onPress={isBlockedByMe ? handleUnblock : handleBlock}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed ? colors.cardPressed : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={isBlockedByMe ? colors.primary : colors.mutedForeground}
              name="ban-outline"
              size={18}
            />
          </Pressable>
        </View>
      </View>
      <ProfileHeader profile={profile} />
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
}


const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
  },
});
