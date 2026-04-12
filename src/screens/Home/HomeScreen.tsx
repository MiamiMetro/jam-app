import { StyleSheet, SafeAreaView } from "react-native";
import React from "react";
import PostList from "@/components/posts/PostList";
import { usePosts } from "@/hooks/usePosts";

const HomeScreen = () => {
  const { posts, isLoading, isLoadingMore, canLoadMore, loadMore } = usePosts();

  return (
    <SafeAreaView style={styles.container}>
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

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
