import { useMemo, type ReactElement } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import type { PostFeedItem } from "@/types";
import PostItem from "./PostItem";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  posts: PostFeedItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  ListHeaderComponent?: ReactElement;
  onEndReached?: () => void;
};

export default function PostList({
  posts,
  isLoading = false,
  isLoadingMore = false,
  ListHeaderComponent,
  onEndReached,
}: Props) {
  const { colors } = useMobileTheme();
  const visiblePosts = useMemo(
    () => posts.filter((post) => !post.deleted_at),
    [posts]
  );

  return (
    <FlatList
      contentContainerStyle={[
        styles.content,
        { backgroundColor: colors.background },
        visiblePosts.length === 0 ? styles.emptyContent : null,
      ]}
      data={visiblePosts}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.centerState}>
          {isLoading ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                Loading posts...
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No posts yet
              </Text>
              <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                Be the first to share something.
              </Text>
            </>
          )}
        </View>
      }
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
        ) : null
      }
      ListHeaderComponent={ListHeaderComponent}
      renderItem={({ item }) => <PostItem post={item} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 46,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
  },
  content: {
    paddingBottom: 18,
  },
  emptyContent: {
    flexGrow: 1,
  },
  footerLoader: {
    marginVertical: 16,
  },
});
