import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import JamItem from "@/components/jams/JamItem";
import ComposePost from "@/components/posts/ComposePost";
import PostItem from "@/components/posts/PostItem";
import {
  useCommunity,
  useCommunityJamAvailability,
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
import {
  useActivateRoom,
  useCommunityRooms,
  useCreateRoom,
  useDeactivateRoom,
  useMyCommunityRoom,
  useUpdateRoom,
} from "@/hooks/useRooms";
import { communityThemeColors } from "@/theme/communityThemeColors";
import { useMobileTheme } from "@/theme/MobileTheme";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import type { CommunityMemberItem, PostFeedItem, RoomFeedItem } from "@/types";
import type { Id } from "@jam-app/convex";

type Props = NativeStackScreenProps<RootStackParamList, "CommunityDetail">;
type DetailTab = "feed" | "jam" | "moderation";
type ListItem = PostFeedItem | CommunityMemberItem | RoomFeedItem;

export default function CommunityDetailScreen({ navigation, route }: Props) {
  const { colors } = useMobileTheme();
  const insets = useSafeAreaInsets();
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
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const activateRoom = useActivateRoom();
  const deactivateRoom = useDeactivateRoom();

  const [activeTab, setActiveTab] = useState<DetailTab>("feed");
  const [memberSearch, setMemberSearch] = useState("");
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [roomFormMode, setRoomFormMode] = useState<"create" | "edit">("create");
  const [roomName, setRoomName] = useState("");
  const [roomHandle, setRoomHandle] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [pendingRoomAction, setPendingRoomAction] = useState<string | null>(
    null,
  );
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(
    null,
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  const {
    posts,
    isLoading: postsLoading,
    isLoadingMore: postsLoadingMore,
    canLoadMore: canLoadMorePosts,
    loadMore: loadMorePosts,
  } = useCommunityPosts(community?.id);

  const jamAvailability = useCommunityJamAvailability(community?.id ?? "");
  const {
    rooms: communityRooms,
    isLoading: communityRoomsLoading,
    isLoadingMore: communityRoomsLoadingMore,
    canLoadMore: canLoadMoreCommunityRooms,
    loadMore: loadMoreCommunityRooms,
  } = useCommunityRooms(community?.id);
  const { room: myCommunityRoom, isLoading: myCommunityRoomLoading } =
    useMyCommunityRoom(community?.id);

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

  const showJamTab =
    jamAvailability.data.enabled ||
    communityRooms.length > 0 ||
    myCommunityRoom !== null;

  useEffect(() => {
    if (!showJamTab && activeTab === "jam") {
      setActiveTab("feed");
    }
  }, [activeTab, showJamTab]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => !post.deleted_at),
    [posts],
  );
  const displayedMembers =
    trimmedMemberSearch.length >= 2 ? searchedMembers : members;
  const listData: ListItem[] =
    activeTab === "feed"
      ? visiblePosts
      : activeTab === "jam"
        ? (communityRooms as RoomFeedItem[])
        : displayedMembers;
  const contentIsLoading =
    activeTab === "feed"
      ? postsLoading
      : activeTab === "jam"
        ? communityRoomsLoading ||
          myCommunityRoomLoading ||
          jamAvailability.isLoading
        : trimmedMemberSearch.length >= 2
          ? searchLoading
          : membersLoading;
  const contentIsLoadingMore =
    activeTab === "feed"
      ? postsLoadingMore
      : activeTab === "jam"
        ? communityRoomsLoadingMore
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
    memberId: string,
  ) => {
    if (!community || pendingMemberAction) return;

    try {
      setError(null);
      setPendingMemberAction(`${action}:${memberId}`);
      if (action === "promote") {
        await promoteMod.mutateAsync({
          communityId: community.id,
          profileId: memberId,
        });
      } else if (action === "demote") {
        await demoteMod.mutateAsync({
          communityId: community.id,
          profileId: memberId,
        });
      } else {
        await removeMember.mutateAsync({
          communityId: community.id,
          profileId: memberId,
        });
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
      ],
    );
  };

  const openCreateRoomForm = () => {
    if (!community) return;

    setRoomFormMode("create");
    setRoomName(`${community.name} Jam`);
    setRoomHandle(suggestRoomHandle(community.handle, profile?.username));
    setRoomDescription("");
    setRoomActionError(null);
    setRoomFormOpen(true);
  };

  const openEditRoomForm = () => {
    if (!myCommunityRoom) return;

    setRoomFormMode("edit");
    setRoomName(myCommunityRoom.name);
    setRoomHandle(myCommunityRoom.handle);
    setRoomDescription(myCommunityRoom.description ?? "");
    setRoomActionError(null);
    setRoomFormOpen(true);
  };

  const submitRoomForm = async () => {
    if (!community || pendingRoomAction) return;

    const trimmedName = roomName.trim();
    const trimmedHandle = roomHandle.trim().toLowerCase();
    const trimmedDescription = roomDescription.trim();

    if (trimmedName.length < 3) {
      setRoomActionError("Room name must be at least 3 characters.");
      return;
    }
    if (roomFormMode === "create" && !/^[a-z0-9-]{3,32}$/.test(trimmedHandle)) {
      setRoomActionError(
        "Handle must be 3-32 lowercase letters, numbers, or hyphens.",
      );
      return;
    }

    try {
      setPendingRoomAction(roomFormMode);
      setRoomActionError(null);

      if (roomFormMode === "create") {
        await createRoom({
          communityId: community.id as Id<"communities">,
          description: trimmedDescription || undefined,
          handle: trimmedHandle,
          isPrivate: false,
          maxPerformers: 5,
          name: trimmedName,
        });
      } else if (myCommunityRoom) {
        await updateRoom({
          description: trimmedDescription || undefined,
          name: trimmedName,
          roomId: myCommunityRoom.id as Id<"rooms">,
        });
      }

      setRoomFormOpen(false);
    } catch (err) {
      setRoomActionError(getRoomErrorMessage(err));
    } finally {
      setPendingRoomAction(null);
    }
  };

  const toggleMyCommunityRoom = async () => {
    if (!myCommunityRoom || pendingRoomAction) return;

    try {
      setPendingRoomAction("toggle");
      setRoomActionError(null);
      if (myCommunityRoom.is_active) {
        await deactivateRoom({ roomId: myCommunityRoom.id as Id<"rooms"> });
      } else {
        await activateRoom({ roomId: myCommunityRoom.id as Id<"rooms"> });
      }
    } catch (err) {
      setRoomActionError(getRoomErrorMessage(err));
    } finally {
      setPendingRoomAction(null);
    }
  };

  const openRoom = (room: Pick<RoomFeedItem, "handle">) => {
    navigation.navigate("JamRoom", { handle: room.handle });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header onBack={() => navigation.goBack()} title="Community" />
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header onBack={() => navigation.goBack()} title="Community" />
        <View style={styles.centerState}>
          <Ionicons color={colors.mutedForeground} name="people-outline" size={34} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Community not found</Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accent =
    communityThemeColors[community.theme_color] ?? communityThemeColors.amber;
  const isJoiningOrLeaving =
    joinCommunity.isPending || leaveCommunity.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
          listData.length === 0 ? styles.emptyContent : null,
        ]}
        data={listData}
        keyExtractor={(item) =>
          isPostItem(item)
            ? item.id
            : isRoomItem(item)
              ? `room:${item.id}`
              : `member:${item.id}:${item.role}`
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {contentIsLoading ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                  {activeTab === "feed"
                    ? "Loading posts..."
                    : activeTab === "jam"
                      ? "Loading jam rooms..."
                      : "Loading members..."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  color={colors.mutedForeground}
                  name={
                    activeTab === "feed"
                      ? "chatbubbles-outline"
                      : activeTab === "jam"
                        ? "radio-outline"
                        : "people-outline"
                  }
                  size={34}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {activeTab === "feed"
                    ? "No posts yet"
                    : activeTab === "jam"
                      ? "No active rooms"
                      : "No members found"}
                </Text>
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                  {activeTab === "feed"
                    ? isMember
                      ? "Be the first to post here."
                      : "Join to start posting."
                    : activeTab === "jam"
                      ? isMember
                        ? "Create or activate your room to start jamming."
                        : "Join this community to see jam controls."
                      : "Try another username."}
                </Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          contentIsLoadingMore ? (
            <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <Header onBack={() => navigation.goBack()} title={community.name} />

            <View style={[styles.banner, { backgroundColor: `${accent}22`, borderBottomColor: colors.border }]}>
              {community.banner_url && !bannerFailed ? (
                <Image
                  onError={() => setBannerFailed(true)}
                  source={{ uri: community.banner_url }}
                  style={styles.bannerImage}
                />
              ) : null}
            </View>

            <View style={[styles.detailPanel, { borderBottomColor: colors.border }]}>
              <View style={styles.identityRow}>
                <View
                  style={[
                    styles.communityAvatar,
                    {
                      backgroundColor: `${accent}22`,
                      borderColor: `${accent}55`,
                    },
                  ]}
                >
                  {community.avatar_url && !avatarFailed ? (
                    <Image
                      onError={() => setAvatarFailed(true)}
                      source={{ uri: community.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text
                      style={[styles.communityAvatarText, { color: accent }]}
                    >
                      {community.name.slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.identityText}>
                  <Text numberOfLines={1} style={[styles.communityName, { color: colors.foreground }]}>
                    {community.name}
                  </Text>
                  <Text style={[styles.communityHandle, { color: accent }]}>
                    #{community.handle}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {community.members_count} member
                  {community.members_count === 1 ? "" : "s"}
                </Text>
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {community.posts_count} post
                  {community.posts_count === 1 ? "" : "s"}
                </Text>
                {effectiveRole ? (
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: `${accent}22` },
                    ]}
                  >
                    <Text style={[styles.roleBadgeText, { color: accent }]}>
                      {formatRole(effectiveRole)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {community.description ? (
                <Text style={[styles.description, { color: colors.secondaryForeground }]}>{community.description}</Text>
              ) : null}

              {community.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {community.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tagPill,
                        { backgroundColor: `${accent}18` },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: accent }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {!isOwner ? (
                <Pressable
                  accessibilityLabel={isMember ? "Leave community" : "Join community"}
                  accessibilityRole="button"
                  disabled={isJoiningOrLeaving}
                  onPress={isMember ? handleLeave : handleJoin}
                  style={[
                    styles.membershipButton,
                    {
                      backgroundColor: isMember ? colors.muted : colors.primary,
                      borderColor: isMember ? colors.destructive : "transparent",
                    },
                    isMember ? styles.membershipButtonJoined : null,
                  ]}
                >
                  {isJoiningOrLeaving ? (
                    <ActivityIndicator color={isMember ? colors.secondaryForeground : colors.primaryForeground} />
                  ) : (
                    <Text
                      style={[
                        styles.membershipButtonText,
                        { color: isMember ? colors.secondaryForeground : colors.primaryForeground },
                      ]}
                    >
                      {isMember ? "Leave community" : "Join community"}
                    </Text>
                  )}
                </Pressable>
              ) : null}

              {error ? <Text style={[styles.error, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive, color: colors.destructive }]}>{error}</Text> : null}
            </View>

            <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
              <Pressable
                accessibilityLabel="Show community feed"
                accessibilityRole="button"
                onPress={() => setActiveTab("feed")}
                style={[
                  styles.tabButton,
                  activeTab === "feed" ? { backgroundColor: colors.accentMuted } : null,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: activeTab === "feed" ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  Feed
                </Text>
              </Pressable>
              {showJamTab ? (
                <Pressable
                  accessibilityLabel="Show community jam rooms"
                  accessibilityRole="button"
                  onPress={() => setActiveTab("jam")}
                  style={[
                    styles.tabButton,
                    activeTab === "jam" ? styles.tabButtonActive : null,
                  ]}
                >
                  <Ionicons
                    color={activeTab === "jam" ? colors.primary : colors.mutedForeground}
                    name="musical-notes-outline"
                    size={15}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                    { color: activeTab === "jam" ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    Jam
                  </Text>
                </Pressable>
              ) : null}
              {canModerate ? (
                <Pressable
                  accessibilityLabel="Show community moderation"
                  accessibilityRole="button"
                  onPress={() => setActiveTab("moderation")}
                  style={[
                    styles.tabButton,
                    activeTab === "moderation" ? styles.tabButtonActive : null,
                  ]}
                >
                  <Ionicons
                    color={activeTab === "moderation" ? colors.primary : colors.mutedForeground}
                    name="shield-checkmark-outline"
                    size={15}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === "moderation"
                        ? { color: colors.primary }
                        : { color: colors.mutedForeground },
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
                <View style={[styles.joinHint, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                  <Text style={[styles.joinHintText, { color: colors.mutedForeground }]}>
                    Join this community to post.
                  </Text>
                </View>
              )
            ) : activeTab === "jam" ? (
              <CommunityJamPanel
                accent={accent}
                canCreateRoom={jamAvailability.data.enabled}
                isMember={isMember}
                isMyRoomLoading={myCommunityRoomLoading}
                myRoom={myCommunityRoom as RoomFeedItem | null}
                onCreateRoom={openCreateRoomForm}
                onEditRoom={openEditRoomForm}
                onOpenRoom={openRoom}
                onToggleRoom={toggleMyCommunityRoom}
                pendingAction={pendingRoomAction}
                roomActionError={roomActionError}
              />
            ) : (
              <View style={[styles.searchPanel, { borderBottomColor: colors.border }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.mutedForeground}
                    importantForAccessibility="no-hide-descendants"
                    name="search"
                    size={17}
                  />
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setMemberSearch}
                    placeholder="Search members"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.searchInput, { color: colors.foreground }]}
                    value={memberSearch}
                  />
                  {memberSearch ? (
                    <Pressable
                      accessibilityLabel="Clear member search"
                      accessibilityRole="button"
                      onPress={() => setMemberSearch("")}
                      style={styles.clearButton}
                    >
                      <Ionicons
                        accessibilityElementsHidden
                        color={colors.mutedForeground}
                        importantForAccessibility="no-hide-descendants"
                        name="close"
                        size={16}
                      />
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
          if (activeTab === "jam") {
            if (canLoadMoreCommunityRooms && !communityRoomsLoadingMore) {
              loadMoreCommunityRooms(10);
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
          ) : isRoomItem(item) ? (
            <JamItem onPress={() => openRoom(item)} room={item} />
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
      <RoomFormModal
        description={roomDescription}
        handle={roomHandle}
        isSubmitting={
          pendingRoomAction === "create" || pendingRoomAction === "edit"
        }
        mode={roomFormMode}
        name={roomName}
        onChangeDescription={setRoomDescription}
        onChangeHandle={(value) => setRoomHandle(value.toLowerCase())}
        onChangeName={setRoomName}
        onClose={() => {
          if (!pendingRoomAction) setRoomFormOpen(false);
        }}
        onSubmit={submitRoomForm}
        error={roomActionError}
        visible={roomFormOpen}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.backButton}
      >
        <Ionicons color={colors.secondaryForeground} name="chevron-back" size={22} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.secondaryForeground }]}>
        {title}
      </Text>
    </View>
  );
}

function CommunityJamPanel({
  accent,
  canCreateRoom,
  isMember,
  isMyRoomLoading,
  myRoom,
  onCreateRoom,
  onEditRoom,
  onOpenRoom,
  onToggleRoom,
  pendingAction,
  roomActionError,
}: {
  accent: string;
  canCreateRoom: boolean;
  isMember: boolean;
  isMyRoomLoading: boolean;
  myRoom: RoomFeedItem | null;
  onCreateRoom: () => void;
  onEditRoom: () => void;
  onOpenRoom: (room: Pick<RoomFeedItem, "handle">) => void;
  onToggleRoom: () => void;
  pendingAction: string | null;
  roomActionError: string | null;
}) {
  const { colors } = useMobileTheme();

  if (!isMember) {
    return (
      <View style={[styles.jamPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.jamPanelTitle, { color: colors.foreground }]}>Community jam rooms</Text>
        <Text style={[styles.jamPanelText, { color: colors.mutedForeground }]}>
          Join this community to enter or host rooms.
        </Text>
      </View>
    );
  }

  if (isMyRoomLoading) {
    return (
      <View style={[styles.jamPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!canCreateRoom && !myRoom) {
    return (
      <View style={[styles.jamPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.jamPanelTitle, { color: colors.foreground }]}>Jam is not enabled</Text>
        <Text style={[styles.jamPanelText, { color: colors.mutedForeground }]}>
          A moderator needs to configure a jam server before rooms can be
          hosted.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.jamPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.jamPanelHeader}>
        <View style={styles.jamPanelHeaderText}>
          <Text style={[styles.jamPanelTitle, { color: colors.foreground }]}>Community jam rooms</Text>
          <Text style={[styles.jamPanelText, { color: colors.mutedForeground }]}>
            Enter active rooms or host one room for this community.
          </Text>
        </View>
        {!myRoom ? (
          <Pressable
            accessibilityLabel="Create community room"
            accessibilityRole="button"
            onPress={onCreateRoom}
            style={[styles.primarySmallButton, { backgroundColor: accent }]}
          >
            <Text style={[styles.primarySmallButtonText, { color: colors.primaryForeground }]}>Create</Text>
          </Pressable>
        ) : null}
      </View>

      {myRoom ? (
        <View style={[styles.myRoomCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.myRoomHeader}>
            <View style={styles.myRoomTitleBlock}>
              <Text numberOfLines={1} style={[styles.myRoomTitle, { color: colors.foreground }]}>
                {myRoom.name}
              </Text>
              <Text style={[styles.myRoomHandle, { color: colors.mutedForeground }]}>jam/{myRoom.handle}</Text>
            </View>
            <View
              style={[
                styles.roomStatusBadge,
                {
                  backgroundColor: myRoom.is_active
                    ? colors.successMuted
                    : colors.muted,
                },
              ]}
            >
              <Text
                style={[
                  styles.roomStatusText,
                  { color: myRoom.is_active ? colors.success : colors.secondaryForeground },
                ]}
              >
                {myRoom.is_active ? "Active" : "Disabled"}
              </Text>
            </View>
          </View>

          <View style={styles.myRoomActions}>
            <Pressable
              accessibilityLabel={`Enter ${myRoom.name}`}
              accessibilityRole="button"
              onPress={() => onOpenRoom(myRoom)}
              style={[styles.secondarySmallButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <Text style={[styles.secondarySmallButtonText, { color: colors.secondaryForeground }]}>Enter</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Open settings for ${myRoom.name}`}
              accessibilityRole="button"
              onPress={onEditRoom}
              style={[styles.secondarySmallButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <Text style={[styles.secondarySmallButtonText, { color: colors.secondaryForeground }]}>Settings</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`${myRoom.is_active ? "Disable" : "Activate"} ${myRoom.name}`}
              accessibilityRole="button"
              disabled={pendingAction === "toggle"}
              onPress={onToggleRoom}
              style={[styles.secondarySmallButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              {pendingAction === "toggle" ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[styles.secondarySmallButtonText, { color: colors.secondaryForeground }]}>
                  {myRoom.is_active ? "Disable" : "Activate"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {roomActionError ? (
        <Text style={[styles.error, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive, color: colors.destructive }]}>{roomActionError}</Text>
      ) : null}
    </View>
  );
}

function RoomFormModal({
  description,
  error,
  handle,
  isSubmitting,
  mode,
  name,
  onChangeDescription,
  onChangeHandle,
  onChangeName,
  onClose,
  onSubmit,
  visible,
}: {
  description: string;
  error: string | null;
  handle: string;
  isSubmitting: boolean;
  mode: "create" | "edit";
  name: string;
  onChangeDescription: (value: string) => void;
  onChangeHandle: (value: string) => void;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  visible: boolean;
}) {
  const { colors } = useMobileTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: colors.card, borderColor: colors.borderStrong }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {mode === "create" ? "Create community room" : "Room settings"}
            </Text>
            <Pressable
              accessibilityLabel="Close room form"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.iconButton}
            >
              <Ionicons color={colors.mutedForeground} name="close" size={18} />
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.secondaryForeground }]}>Name</Text>
          <TextInput
            editable={!isSubmitting}
            onChangeText={onChangeName}
            placeholder="Room name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.borderStrong, color: colors.foreground }]}
            value={name}
          />

          {mode === "create" ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.secondaryForeground }]}>Handle</Text>
              <TextInput
                autoCapitalize="none"
                editable={!isSubmitting}
                onChangeText={onChangeHandle}
                placeholder="room-handle"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.borderStrong, color: colors.foreground }]}
                value={handle}
              />
            </>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.secondaryForeground }]}>Description</Text>
          <TextInput
            editable={!isSubmitting}
            multiline
            onChangeText={onChangeDescription}
            placeholder="Describe the room"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.background, borderColor: colors.borderStrong, color: colors.foreground }]}
            textAlignVertical="top"
            value={description}
          />

          {error ? <Text style={[styles.error, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive, color: colors.destructive }]}>{error}</Text> : null}

          <Pressable
            accessibilityLabel={mode === "create" ? "Create community room" : "Save room settings"}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={onSubmit}
            style={[
              styles.modalSubmitButton,
              { backgroundColor: colors.primary },
              isSubmitting ? styles.modalSubmitButtonDisabled : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.modalSubmitText, { color: colors.primaryForeground }]}>
                {mode === "create" ? "Create room" : "Save changes"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
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
  const { colors } = useMobileTheme();
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
    <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.memberAvatar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {member.avatar_url && !avatarFailed ? (
          <Image
            onError={() => setAvatarFailed(true)}
            source={{ uri: member.avatar_url }}
            style={styles.memberAvatarImage}
          />
        ) : (
          <Text style={[styles.memberAvatarFallback, { color: colors.secondaryForeground }]}>
            {member.username.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.memberBody}>
        <Text numberOfLines={1} style={[styles.memberUsername, { color: colors.foreground }]}>
          @{member.username}
        </Text>
        {member.display_name ? (
          <Text numberOfLines={1} style={[styles.memberDisplayName, { color: colors.mutedForeground }]}>
            {member.display_name}
          </Text>
        ) : null}
      </View>
      <View style={styles.memberActions}>
        <View
          style={[
            styles.memberRoleBadge,
            isOwnerRow || isModRow
              ? { backgroundColor: `${themeColor}22` }
              : { backgroundColor: colors.muted },
          ]}
        >
          <Text
            style={[
              styles.memberRoleText,
              isOwnerRow || isModRow ? { color: themeColor } : { color: colors.secondaryForeground },
            ]}
          >
            {formatRole(member.role)}
          </Text>
        </View>
        {isBusy ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            {canPromote ? (
              <Pressable
                accessibilityLabel={`Promote ${member.username}`}
                accessibilityRole="button"
                onPress={onPromote}
                style={styles.iconButton}
              >
                <Ionicons color={colors.mutedForeground} name="chevron-up" size={17} />
              </Pressable>
            ) : null}
            {canDemote ? (
              <Pressable
                accessibilityLabel={`Demote ${member.username}`}
                accessibilityRole="button"
                onPress={onDemote}
                style={styles.iconButton}
              >
                <Ionicons color={colors.mutedForeground} name="chevron-down" size={17} />
              </Pressable>
            ) : null}
            {canRemove ? (
              <Pressable
                accessibilityLabel={`Remove ${member.username}`}
                accessibilityRole="button"
                onPress={onRemove}
                style={styles.iconButton}
              >
                <Ionicons
                  color={colors.destructive}
                  name="person-remove-outline"
                  size={16}
                />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function isPostItem(item: ListItem): item is PostFeedItem {
  return "author_id" in item;
}

function isRoomItem(item: ListItem): item is RoomFeedItem {
  return "host_id" in item && "max_performers" in item;
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

function getRoomErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stripped = message.replace(/^[A-Z_]+:\s*/, "");

  if (message.includes("HANDLE_TAKEN")) {
    return "That room handle is already in use.";
  }
  if (message.includes("ROOM_LIMIT_REACHED")) {
    return "You can only host one room in this community.";
  }
  if (message.includes("COMMUNITY_MEMBER_REQUIRED")) {
    return "Join this community before hosting a room.";
  }
  if (message.includes("JAM_SERVER_NOT_CONFIGURED")) {
    return "A moderator needs to configure a jam server first.";
  }
  if (message.includes("UNAUTHORIZED")) {
    return "You do not have permission to manage this room.";
  }
  if (message.includes("ROOM_NAME_TOO_SHORT")) {
    return "Room name must be at least 3 characters.";
  }

  return stripped || "Room action failed. Please try again.";
}

function suggestRoomHandle(communityHandle: string, username?: string) {
  const base = `${communityHandle}-${username ?? "room"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return base.length >= 3 ? base : `room-${Date.now().toString(36)}`;
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
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 22,
  },
  description: {
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
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  joinHintText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  jamPanel: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  jamPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  jamPanelHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  jamPanelText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  jamPanelTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  memberActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 5,
  },
  memberAvatar: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  memberAvatarFallback: {
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
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  memberRoleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberRoleText: {
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
    fontSize: 14,
    fontWeight: "900",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  modalInput: {
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginTop: 7,
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  modalPanel: {
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    width: "100%",
  },
  modalSubmitButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 42,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.7,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: "900",
  },
  modalTextArea: {
    minHeight: 82,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  membershipButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 42,
    marginTop: 14,
  },
  membershipButtonJoined: {
    borderColor: "rgba(248,113,113,0.35)",
    borderWidth: 1,
  },
  membershipButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  membershipButtonTextJoined: {},
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 13,
  },
  myRoomActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  myRoomCard: {
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  myRoomHandle: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  myRoomHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  myRoomTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  myRoomTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  primarySmallButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  primarySmallButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  searchBox: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
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
  roomStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  roomStatusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  secondarySmallButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 78,
    paddingHorizontal: 12,
  },
  secondarySmallButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  stateText: {
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
    fontSize: 12,
    fontWeight: "900",
  },
  tabButtonTextActive: {},
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
