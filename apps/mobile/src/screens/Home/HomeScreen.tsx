import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <PostList
        posts={posts}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerCopy}>
                <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>
                  Latest posts
                </Text>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                  Feed
                </Text>
              </View>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: colors.accentMuted, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.primary}
                  importantForAccessibility="no-hide-descendants"
                  name="radio-outline"
                  size={20}
                />
              </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  headerIcon: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
