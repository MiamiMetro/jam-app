import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import React from "react";
import PostList from "@/components/posts/PostList";
import ComposePost from "@/components/posts/ComposePost";
import { usePosts } from "@/hooks/usePosts";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMobileTheme } from "@/theme/MobileTheme";

const HomeScreen = () => {
  const { colors } = useMobileTheme();
  const { posts, isLoading, isLoadingMore, canLoadMore, loadMore } = usePosts();
  const { profile } = useMyProfile();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <PostList
        posts={posts}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerIcon, { color: colors.mutedForeground }]}>
                RSS
              </Text>
              <Text style={[styles.headerTitle, { color: colors.secondaryForeground }]}>
                Feed
              </Text>
            </View>
            <ComposePost profile={profile} />
          </>
        }
        onEndReached={() => {
          if (canLoadMore && !isLoadingMore) {
            loadMore(10);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerIcon: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
});
