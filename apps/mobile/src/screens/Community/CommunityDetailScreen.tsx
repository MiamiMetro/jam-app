import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ComposePost from "@/components/posts/ComposePost";
import PostItem from "@/components/posts/PostItem";
import {
  useCommunity,
  useCommunityMembers,
  useDemoteMod,
  useJoinCommunity,
  useLeaveCommunity,
  useMemberRole,
  usePromoteMod,
  useRemoveMember,
  useSearchCommunityMembers,
} from "@/hooks/useCommunities";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useCommunityPosts } from "@/hooks/usePosts";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import type { CommunityMemberItem, PostFeedItem } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "CommunityDetail">;
type DetailTab = "feed" | "moderation";

const THEME_COLOR_VALUES: Record<string, string> = {
  amber: "#D8A64A",
  blue: "#5D9CEC",
  green: "#4FB477",
  teal: "#35B7A5",
  cyan: "#41BBD9",
  red: "#EF6F6C",
  pink: "#E879B9",
  indigo: "#7C8CF8",
  purple: "#A97CF8",
  orange: "#E89A55",
};

export default function CommunityDetailScreen({ navigation, route }: Props) {
  const { handle } = route.params;
  const { data: community, isLoading } = useCommunity(handle);
  const { profile } = useMyProfile();
  const memberRole = useMemberRole(community?.id ?? "");
  const effectiveRole = memberRole || community?.member_role || null;
  const isMember = effectiveRole !== null;
  const isOwner = effectiveRole === "owner";
  const isMod = effectiveRole === "mod";
  const canModerate = isOwner || isMod;

  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();
  const promoteMod = usePromoteMod();
  const demoteMod = useDemoteMod();
  const removeMember = useRemoveMember();

  const [activeTab, setActiveTab] = useState<DetailTab>("feed");
  const [memberSearch, setMemberSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  const {
    posts,
    isLoading: postsLoading,
    isLoadingMore: postsLoadingMore,
    canLoadMore: canLoadMorePosts,
    loadMore: loadMorePosts,
  } = useCommunityPosts(community?.id);

  const {
    data: members,
    fetchNextPage: fetchMoreMembers,
    hasNextPage: hasMoreMembers,
    isFetchingNextPage: membersLoadingMore,
    isLoading: membersLoading,
  } = useCommunityMembers(community?.id ?? "");

  const trimmedMemberSearch = memberSearch.trim();
  const {
    data: searchedMembers,
    isFetchingNextPage: searchedMembersLoadingMore,
    isLoading: searchLoading,
  } = useSearchCommunityMembers(community?.id ?? "", trimmedMemberSearch);

  useEffect(() => {
    if (!canModerate && activeTab === "moderation") {
      setActiveTab("feed");
    }
  }, [activeTab, canModerate]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => !post.deleted_at),
    [posts]
  );
  const displayedMembers =
    trimmedMemberSearch.length >= 2 ? searchedMembers : members;
  const listData: Array<PostFeedItem | CommunityMemberItem> =
    activeTab === "feed" ? visiblePosts : displayedMembers;
  const contentIsLoading =
    activeTab === "feed"
      ? postsLoading
      : trimmedMemberSearch.length >= 2
        ? searchLoading
        : membersLoading;
  const contentIsLoadingMore =
    activeTab === "feed"
      ? postsLoadingMore
      : trimmedMemberSearch.length >= 2
        ? searchedMembersLoadingMore
        : membersLoadingMore;

  const handleJoin = async () => {
    if (!community || joinCommunity.isPending) return;

    try {
      setError(null);
      await joinCommunity.mutateAsync(community.id);
    } catch (err) {
      setError(getCommunityErrorMessage(err));
    }
  };

  const handleLeave = async () => {
    if (!community || leaveCommunity.isPending) return;

    try {
      setError(null);
      await leaveCommunity.mutateAsync(community.id);
    } catch (err) {
      setError(getCommunityErrorMessage(err));
    }
  };

  const runMemberAction = async (
    action: "promote" | "demote" | "remove",
    memberId: string
  ) => {
    if (!community || pendingMemberAction) return;

    try {
      setError(null);
      setPendingMemberAction(`${action}:${memberId}`);
      if (action === "promote") {
        await promoteMod.mutateAsync({ communityId: community.id, profileId: memberId });
      } else if (action === "demote") {
        await demoteMod.mutateAsync({ communityId: community.id, profileId: memberId });
      } else {
        await removeMember.mutateAsync({ communityId: community.id, profileId: memberId });
      }
    } catch (err) {
      setError(getCommunityErrorMessage(err));
    } finally {
      setPendingMemberAction(null);
    }
  };

  const confirmRemoveMember = (member: CommunityMemberItem) => {
    Alert.alert(
      "Remove member?",
      `@${member.username} will lose access to member posting and community privileges.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => runMemberAction("remove", member.id),
          style: "destructive",
          text: "Remove",
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} title="Community" />
        <View style={styles.centerState}>
          <ActivityIndicator color="#D8A64A" />
          <Text style={styles.stateText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} title="Community" />
        <View style={styles.centerState}>
          <Ionicons color="#4B5565" name="people-outline" size={34} />
          <Text style={styles.emptyTitle}>Community not found</Text>
          <Text style={styles.stateText}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accent = THEME_COLOR_VALUES[community.theme_color] ?? THEME_COLOR_VALUES.amber;
  const isJoiningOrLeaving = joinCommunity.isPending || leaveCommunity.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          listData.length === 0 ? styles.emptyContent : null,
        ]}
        data={listData}
        keyExtractor={(item) =>
          isPostItem(item) ? item.id : `member:${item.id}:${item.role}`
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {contentIsLoading ? (
              <>
                <ActivityIndicator color="#D8A64A" />
                <Text style={styles.stateText}>
                  {activeTab === "feed" ? "Loading posts..." : "Loading members..."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  color="#4B5565"
                  name={activeTab === "feed" ? "chatbubbles-outline" : "people-outline"}
                  size={34}
                />
                <Text style={styles.emptyTitle}>
                  {activeTab === "feed" ? "No posts yet" : "No members found"}
                </Text>
                <Text style={styles.stateText}>
                  {activeTab === "feed"
                    ? isMember
                      ? "Be the first to post here."
                      : "Join to start posting."
                    : "Try another username."}
                </Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          contentIsLoadingMore ? (
            <ActivityIndicator color="#D8A64A" style={styles.footerLoader} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <Header onBack={() => navigation.goBack()} title={community.name} />

            <View style={[styles.banner, { backgroundColor: `${accent}22` }]}>
              {community.banner_url && !bannerFailed ? (
                <Image
                  onError={() => setBannerFailed(true)}
                  source={{ uri: community.banner_url }}
                  style={styles.bannerImage}
                />
              ) : null}
            </View>

            <View style={styles.detailPanel}>
              <View style={styles.identityRow}>
                <View
                  style={[
                    styles.communityAvatar,
                    { backgroundColor: `${accent}22`, borderColor: `${accent}55` },
                  ]}
                >
                  {community.avatar_url && !avatarFailed ? (
                    <Image
                      onError={() => setAvatarFailed(true)}
                      source={{ uri: community.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={[styles.communityAvatarText, { color: accent }]}>
                      {community.name.slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.identityText}>
                  <Text numberOfLines={1} style={styles.communityName}>
                    {community.name}
                  </Text>
                  <Text style={[styles.communityHandle, { color: accent }]}>
                    #{community.handle}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <Text style={styles.statText}>
                  {community.members_count} member
                  {community.members_count === 1 ? "" : "s"}
                </Text>
                <Text style={styles.statText}>
                  {community.posts_count} post
                  {community.posts_count === 1 ? "" : "s"}
                </Text>
                {effectiveRole ? (
                  <View style={[styles.roleBadge, { backgroundColor: `${accent}22` }]}>
                    <Text style={[styles.roleBadgeText, { color: accent }]}>
                      {formatRole(effectiveRole)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {community.description ? (
                <Text style={styles.description}>{community.description}</Text>
              ) : null}

              {community.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {community.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[styles.tagPill, { backgroundColor: `${accent}18` }]}
                    >
                      <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {!isOwner ? (
                <Pressable
                  disabled={isJoiningOrLeaving}
                  onPress={isMember ? handleLeave : handleJoin}
                  style={[
                    styles.membershipButton,
                    isMember ? styles.membershipButtonJoined : null,
                  ]}
                >
                  {isJoiningOrLeaving ? (
                    <ActivityIndicator color={isMember ? "#D5D9E2" : "#251B0A"} />
                  ) : (
                    <Text
                      style={[
                        styles.membershipButtonText,
                        isMember ? styles.membershipButtonTextJoined : null,
                      ]}
                    >
                      {isMember ? "Leave community" : "Join community"}
                    </Text>
                  )}
                </Pressable>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setActiveTab("feed")}
                style={[styles.tabButton, activeTab === "feed" ? styles.tabButtonActive : null]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "feed" ? styles.tabButtonTextActive : null,
                  ]}
                >
                  Feed
                </Text>
              </Pressable>
              {canModerate ? (
                <Pressable
                  onPress={() => setActiveTab("moderation")}
                  style={[
                    styles.tabButton,
                    activeTab === "moderation" ? styles.tabButtonActive : null,
                  ]}
                >
                  <Ionicons
                    color={activeTab === "moderation" ? "#D8A64A" : "#8F98A8"}
                    name="shield-checkmark-outline"
                    size={15}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === "moderation" ? styles.tabButtonTextActive : null,
                    ]}
                  >
                    Moderation
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {activeTab === "feed" ? (
              isMember ? (
                <ComposePost
                  communityId={community.id}
                  placeholder={`Post to #${community.handle}...`}
                  profile={profile}
                />
              ) : (
                <View style={styles.joinHint}>
                  <Text style={styles.joinHintText}>Join this community to post.</Text>
                </View>
              )
            ) : (
              <View style={styles.searchPanel}>
                <View style={styles.searchBox}>
                  <Ionicons color="#8F98A8" name="search" size={17} />
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setMemberSearch}
                    placeholder="Search members"
                    placeholderTextColor="#7E8796"
                    style={styles.searchInput}
                    value={memberSearch}
                  />
                  {memberSearch ? (
                    <Pressable onPress={() => setMemberSearch("")} style={styles.clearButton}>
                      <Ionicons color="#8F98A8" name="close" size={16} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </>
        }
        onEndReached={() => {
          if (activeTab === "feed") {
            if (canLoadMorePosts && !postsLoadingMore) {
              loadMorePosts(10);
            }
            return;
          }
          if (
            trimmedMemberSearch.length < 2 &&
            hasMoreMembers &&
            !membersLoadingMore
          ) {
            fetchMoreMembers();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) =>
          isPostItem(item) ? (
            <PostItem post={item} />
          ) : (
            <MemberRow
              canModerateAsMod={isMod}
              canModerateAsOwner={isOwner}
              member={item}
              onDemote={() => runMemberAction("demote", item.id)}
              onPromote={() => runMemberAction("promote", item.id)}
              onRemove={() => confirmRemoveMember(item)}
              pendingAction={pendingMemberAction}
              selfProfileId={profile?.id}
              themeColor={accent}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons color="#EEF0F5" name="chevron-back" size={22} />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

function MemberRow({
  canModerateAsMod,
  canModerateAsOwner,
  member,
  onDemote,
  onPromote,
  onRemove,
  pendingAction,
  selfProfileId,
  themeColor,
}: {
  canModerateAsMod: boolean;
  canModerateAsOwner: boolean;
  member: CommunityMemberItem;
  onDemote: () => void;
  onPromote: () => void;
  onRemove: () => void;
  pendingAction: string | null;
  selfProfileId?: string;
  themeColor: string;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const isSelf = selfProfileId === member.id;
  const isOwnerRow = member.role === "owner";
  const isModRow = member.role === "mod";
  const isMemberRow = member.role === "member";
  const canPromote = canModerateAsOwner && isMemberRow && !isSelf;
  const canDemote = canModerateAsOwner && isModRow && !isSelf;
  const canRemove =
    !isSelf &&
    !isOwnerRow &&
    (canModerateAsOwner || (canModerateAsMod && isMemberRow));
  const isBusy = pendingAction?.endsWith(`:${member.id}`) ?? false;

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        {member.avatar_url && !avatarFailed ? (
          <Image
            onError={() => setAvatarFailed(true)}
            source={{ uri: member.avatar_url }}
            style={styles.memberAvatarImage}
          />
        ) : (
          <Text style={styles.memberAvatarFallback}>
            {member.username.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.memberBody}>
        <Text numberOfLines={1} style={styles.memberUsername}>
          @{member.username}
        </Text>
        {member.display_name ? (
          <Text numberOfLines={1} style={styles.memberDisplayName}>
            {member.display_name}
          </Text>
        ) : null}
      </View>
      <View style={styles.memberActions}>
        <View
          style={[
            styles.memberRoleBadge,
            isOwnerRow || isModRow ? { backgroundColor: `${themeColor}22` } : null,
          ]}
        >
          <Text
            style={[
              styles.memberRoleText,
              isOwnerRow || isModRow ? { color: themeColor } : null,
            ]}
          >
            {formatRole(member.role)}
          </Text>
        </View>
        {isBusy ? (
          <ActivityIndicator color="#D8A64A" size="small" />
        ) : (
          <>
            {canPromote ? (
              <Pressable onPress={onPromote} style={styles.iconButton}>
                <Ionicons color="#8F98A8" name="chevron-up" size={17} />
              </Pressable>
            ) : null}
            {canDemote ? (
              <Pressable onPress={onDemote} style={styles.iconButton}>
                <Ionicons color="#8F98A8" name="chevron-down" size={17} />
              </Pressable>
            ) : null}
            {canRemove ? (
              <Pressable onPress={onRemove} style={styles.iconButton}>
                <Ionicons color="#FECACA" name="person-remove-outline" size={16} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function isPostItem(item: PostFeedItem | CommunityMemberItem): item is PostFeedItem {
  return "author_id" in item;
}

function formatRole(role: string) {
  if (role === "owner") return "Owner";
  if (role === "mod") return "Mod";
  return "Member";
}

function getCommunityErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stripped = message.replace(/^[A-Z_]+:\s*/, "");

  if (message.includes("ALREADY_MEMBER")) {
    return "You are already a member.";
  }
  if (message.includes("OWNER_CANNOT_LEAVE")) {
    return "Owners cannot leave their own community.";
  }
  if (message.includes("UNAUTHORIZED")) {
    return "You do not have permission to do that.";
  }
  if (message.includes("NOT_MEMBER")) {
    return "That member is no longer in this community.";
  }
  if (message.includes("INVALID_ROLE")) {
    return "That role change is not available.";
  }
  if (message.includes("CANNOT_REMOVE_OWNER")) {
    return "The owner cannot be removed.";
  }
  if (message.includes("Rate limit")) {
    return "Slow down for a moment before trying again.";
  }

  return stripped || "Something went wrong. Please try again.";
}

const styles = StyleSheet.create({
  avatarImage: {
    height: 74,
    width: 74,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  banner: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    height: 112,
    overflow: "hidden",
  },
  bannerImage: {
    height: "100%",
    width: "100%",
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  clearButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  communityAvatar: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 74,
    justifyContent: "center",
    overflow: "hidden",
    width: 74,
  },
  communityAvatarText: {
    fontSize: 20,
    fontWeight: "900",
  },
  communityHandle: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  communityName: {
    color: "#EEF0F5",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  container: {
    backgroundColor: "#1A1E29",
    flex: 1,
  },
  content: {
    paddingBottom: 22,
  },
  description: {
    color: "#C7CCD6",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  detailPanel: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyTitle: {
    color: "#EEF0F5",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  error: {
    backgroundColor: "rgba(127,29,29,0.5)",
    borderColor: "rgba(248,113,113,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    color: "#FECACA",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerLoader: {
    marginVertical: 16,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "#B0B7C4",
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  joinHint: {
    backgroundColor: "#262B37",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  joinHintText: {
    color: "#8F98A8",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  memberActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 5,
  },
  memberAvatar: {
    alignItems: "center",
    backgroundColor: "#353B49",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  memberAvatarFallback: {
    color: "#C7CCD6",
    fontSize: 12,
    fontWeight: "900",
  },
  memberAvatarImage: {
    height: 40,
    width: 40,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberDisplayName: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  memberRoleBadge: {
    backgroundColor: "#353B49",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberRoleText: {
    color: "#D5D9E2",
    fontSize: 11,
    fontWeight: "900",
  },
  memberRow: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  memberUsername: {
    color: "#EEF0F5",
    fontSize: 14,
    fontWeight: "900",
  },
  membershipButton: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 42,
    marginTop: 14,
  },
  membershipButtonJoined: {
    backgroundColor: "#353B49",
    borderColor: "rgba(248,113,113,0.35)",
    borderWidth: 1,
  },
  membershipButtonText: {
    color: "#251B0A",
    fontSize: 14,
    fontWeight: "900",
  },
  membershipButtonTextJoined: {
    color: "#D5D9E2",
  },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#262B37",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: "#EEF0F5",
    flex: 1,
    fontSize: 15,
    minWidth: 0,
  },
  searchPanel: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stateText: {
    color: "#8F98A8",
    marginTop: 10,
    textAlign: "center",
  },
  statsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 13,
  },
  statText: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "800",
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tabButtonActive: {
    backgroundColor: "rgba(216,166,74,0.14)",
  },
  tabButtonText: {
    color: "#8F98A8",
    fontSize: 12,
    fontWeight: "900",
  },
  tabButtonTextActive: {
    color: "#D8A64A",
  },
  tabs: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "900",
  },
});
