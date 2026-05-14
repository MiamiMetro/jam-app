import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useAcceptFriend,
  useDeleteFriend,
  useFriendRequests,
  useFriends,
  useRequestFriend,
  useSentFriendRequests,
  type FriendProfile,
} from "@/hooks/useFriends";
import {
  useAllUsers,
  useConversations,
  useEnsureDmConversation,
  type UIConversation,
} from "@/hooks/useUsers";
import { useMobileTheme } from "@/theme/MobileTheme";
import type { User } from "@/types";

type TabKey = "chats" | "friends" | "find";

const INITIAL_PAGE_SIZE = 25;

export default function MessagesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("chats");
  const [friendSearch, setFriendSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conversationsQuery = useConversations();
  const friendsQuery = useFriends(friendSearch);
  const requestsQuery = useFriendRequests();
  const sentRequestsQuery = useSentFriendRequests();
  const usersQuery = useAllUsers(userSearch.trim(), true);
  const ensureDm = useEnsureDmConversation();
  const sendFriendRequest = useRequestFriend();
  const acceptFriendRequest = useAcceptFriend();
  const removeFriend = useDeleteFriend();

  const friends = friendsQuery.data;
  const incomingRequests = requestsQuery.data;
  const sentRequests = sentRequestsQuery.data;
  const conversations = conversationsQuery.data;
  const users = usersQuery.data;

  const friendIds = useMemo(
    () => new Set(friends.map((friend) => String(friend.id))),
    [friends]
  );
  const incomingRequestIds = useMemo(
    () => new Set(incomingRequests.map((request) => String(request.id))),
    [incomingRequests]
  );
  const sentRequestIds = useMemo(
    () => new Set(sentRequests.map((request) => String(request.id))),
    [sentRequests]
  );

  const openConversation = async (userId: string, title?: string) => {
    if (busyUserId) return;

    try {
      setError(null);
      setBusyUserId(userId);
      const conversationId = await ensureDm.mutateAsync(userId);
      navigation.navigate("Conversation", {
        conversationId,
        title,
      });
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (busyUserId) return;

    try {
      setError(null);
      setBusyUserId(userId);
      await sendFriendRequest.mutateAsync(userId);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    if (busyUserId) return;

    try {
      setError(null);
      setBusyUserId(userId);
      await acceptFriendRequest.mutateAsync(userId);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemoveRelation = async (userId: string) => {
    if (busyUserId) return;

    try {
      setError(null);
      setBusyUserId(userId);
      await removeFriend.mutateAsync(userId);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
            Inbox
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        </View>
        {incomingRequests.length > 0 ? (
          <View style={[styles.requestBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.requestBadgeText, { color: colors.primaryForeground }]}>
              {incomingRequests.length}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(["chats", "friends", "find"] as TabKey[]).map((tab) => (
          <Pressable
            accessibilityLabel={`Show ${getTabLabel(tab)}`}
            accessibilityRole="button"
            key={tab}
            onPress={() => {
              setError(null);
              setActiveTab(tab);
            }}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === tab ? colors.accentMuted : colors.input,
                borderColor: activeTab === tab ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab ? colors.primary : colors.mutedForeground,
                },
              ]}
            >
              {getTabLabel(tab)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.destructiveMuted,
              borderColor: colors.destructive,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
        </View>
      ) : null}

      {activeTab === "chats" ? (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            conversationsQuery.isLoading ? (
              <LoadingState label="Loading conversations..." />
            ) : (
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="No conversations yet"
                body="Message a friend to start a DM."
              />
            )
          }
          ListFooterComponent={
            conversationsQuery.hasNextPage ? (
              <LoadMoreButton
                label="Load more conversations"
                onPress={conversationsQuery.fetchNextPage}
              />
            ) : conversationsQuery.isFetchingNextPage ? (
              <LoadingMore />
            ) : null
          }
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() =>
                navigation.navigate("Conversation", {
                  conversationId: item.id,
                  title: getConversationTitle(item),
                })
              }
            />
          )}
        />
      ) : null}

      {activeTab === "friends" ? (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          data={friends}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View>
              <RequestsSection
                busyUserId={busyUserId}
                incomingRequests={incomingRequests}
                onAccept={handleAcceptRequest}
                onDecline={handleRemoveRelation}
              />
              <SearchBox
                onChangeText={setFriendSearch}
                placeholder="Search friends..."
                value={friendSearch}
              />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Friends
              </Text>
            </View>
          }
          ListEmptyComponent={
            friendsQuery.isLoading ? (
              <LoadingState label="Loading friends..." />
            ) : (
              <EmptyState
                icon="people-outline"
                title="No friends yet"
                body="Use Find to send a friend request."
              />
            )
          }
          ListFooterComponent={
            friendsQuery.hasNextPage ? (
              <LoadMoreButton
                label="Load more friends"
                onPress={friendsQuery.fetchNextPage}
              />
            ) : friendsQuery.isFetchingNextPage ? (
              <LoadingMore />
            ) : null
          }
          renderItem={({ item }) => (
            <FriendRow
              busy={busyUserId === String(item.id)}
              friend={item}
              onMessage={() => openConversation(String(item.id), item.username)}
              onRemove={() => handleRemoveRelation(String(item.id))}
            />
          )}
        />
      ) : null}

      {activeTab === "find" ? (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          data={users}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View>
              <SearchBox
                onChangeText={setUserSearch}
                placeholder="Search users..."
                value={userSearch}
              />
              <SentRequestsSection
                busyUserId={busyUserId}
                onCancel={handleRemoveRelation}
                sentRequests={sentRequests}
              />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                {userSearch.trim() ? "Search results" : "People"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            usersQuery.isLoading ? (
              <LoadingState label="Loading users..." />
            ) : (
              <EmptyState
                icon="search-outline"
                title="No users found"
                body="Try another username."
              />
            )
          }
          ListFooterComponent={
            usersQuery.hasNextPage ? (
              <LoadMoreButton
                label="Load more users"
                onPress={usersQuery.fetchNextPage}
              />
            ) : usersQuery.isFetchingNextPage ? (
              <LoadingMore />
            ) : null
          }
          renderItem={({ item }) => (
            <SearchUserRow
              busy={busyUserId === String(item.id)}
              isFriend={friendIds.has(String(item.id))}
              hasIncomingRequest={incomingRequestIds.has(String(item.id))}
              hasSentRequest={sentRequestIds.has(String(item.id))}
              onAccept={() => handleAcceptRequest(String(item.id))}
              onCancel={() => handleRemoveRelation(String(item.id))}
              onMessage={() => openConversation(String(item.id), item.username)}
              onRequest={() => handleSendRequest(String(item.id))}
              user={item}
            />
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: UIConversation;
  onPress: () => void;
}) {
  const { colors } = useMobileTheme();
  const title = getConversationTitle(conversation);
  const lastMessage = getLastMessagePreview(conversation);

  return (
    <Pressable
      accessibilityLabel={`Open conversation with ${title}. ${lastMessage}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.cardPressed : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Avatar user={conversation.otherUser ?? undefined} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
            {formatRelativeTime(conversation.lastMessage?.timestamp)}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
          {lastMessage}
        </Text>
      </View>
      {conversation.hasUnread ? (
        <View
          style={[
            styles.unreadDot,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

function FriendRow({
  busy,
  friend,
  onMessage,
  onRemove,
}: {
  busy: boolean;
  friend: FriendProfile;
  onMessage: () => void;
  onRemove: () => void;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Avatar user={friend} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>
          {friend.username}
        </Text>
        <Text numberOfLines={1} style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
          Friends since {formatShortDate(friend.friends_since)}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Message ${friend.username}`}
        accessibilityRole="button"
        disabled={busy}
        onPress={onMessage}
        style={[styles.smallPrimaryButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.smallPrimaryText, { color: colors.primaryForeground }]}>
          {busy ? "..." : "DM"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${friend.username}`}
        accessibilityRole="button"
        disabled={busy}
        onPress={onRemove}
        style={styles.iconButton}
      >
        <Ionicons
          accessibilityElementsHidden
          color={colors.mutedForeground}
          importantForAccessibility="no-hide-descendants"
          name="person-remove-outline"
          size={17}
        />
      </Pressable>
    </View>
  );
}

function SearchUserRow({
  busy,
  hasIncomingRequest,
  hasSentRequest,
  isFriend,
  onAccept,
  onCancel,
  onMessage,
  onRequest,
  user,
}: {
  busy: boolean;
  hasIncomingRequest: boolean;
  hasSentRequest: boolean;
  isFriend: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onMessage: () => void;
  onRequest: () => void;
  user: User;
}) {
  const { colors } = useMobileTheme();
  let actionLabel = "Add";
  let action = onRequest;
  let secondaryAction: (() => void) | null = null;
  let secondaryIcon: keyof typeof Ionicons.glyphMap | null = null;

  if (isFriend) {
    actionLabel = "DM";
    action = onMessage;
  } else if (hasIncomingRequest) {
    actionLabel = "Accept";
    action = onAccept;
  } else if (hasSentRequest) {
    actionLabel = "Pending";
    action = onCancel;
    secondaryAction = onCancel;
    secondaryIcon = "close";
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Avatar user={user} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>
          {user.username}
        </Text>
        <Text numberOfLines={1} style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
          {user.display_name || "Jam user"}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`${actionLabel} ${user.username}`}
        accessibilityRole="button"
        disabled={busy}
        onPress={action}
        style={[
          styles.smallPrimaryButton,
          hasSentRequest
            ? {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                borderWidth: 1,
              }
            : { backgroundColor: colors.primary },
        ]}
      >
        <Text
          style={[
            styles.smallPrimaryText,
            {
              color: hasSentRequest
                ? colors.secondaryForeground
                : colors.primaryForeground,
            },
          ]}
        >
          {busy ? "..." : actionLabel}
        </Text>
      </Pressable>
      {secondaryAction && secondaryIcon ? (
        <Pressable
          accessibilityLabel={`Cancel request to ${user.username}`}
          accessibilityRole="button"
          disabled={busy}
          onPress={secondaryAction}
          style={styles.iconButton}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.mutedForeground}
            importantForAccessibility="no-hide-descendants"
            name={secondaryIcon}
            size={18}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function RequestsSection({
  busyUserId,
  incomingRequests,
  onAccept,
  onDecline,
}: {
  busyUserId: string | null;
  incomingRequests: FriendProfile[];
  onAccept: (userId: string) => void;
  onDecline: (userId: string) => void;
}) {
  const { colors } = useMobileTheme();

  if (incomingRequests.length === 0) return null;

  return (
    <View style={[styles.sectionBlock, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        Friend requests
      </Text>
      {incomingRequests.map((request) => {
        const busy = busyUserId === String(request.id);
        return (
          <View key={String(request.id)} style={styles.requestRow}>
            <Avatar size={38} user={request} />
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>
                {request.username}
              </Text>
              <Text style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
                {formatRelativeTime(request.requested_at)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Accept friend request from ${request.username}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onAccept(String(request.id))}
              style={[styles.smallPrimaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.smallPrimaryText, { color: colors.primaryForeground }]}>
                {busy ? "..." : "Accept"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Decline friend request from ${request.username}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onDecline(String(request.id))}
              style={styles.iconButton}
            >
              <Ionicons
                accessibilityElementsHidden
                color={colors.mutedForeground}
                importantForAccessibility="no-hide-descendants"
                name="close"
                size={18}
              />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function SentRequestsSection({
  busyUserId,
  onCancel,
  sentRequests,
}: {
  busyUserId: string | null;
  onCancel: (userId: string) => void;
  sentRequests: FriendProfile[];
}) {
  const { colors } = useMobileTheme();

  if (sentRequests.length === 0) return null;

  return (
    <View style={[styles.sectionBlock, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        Sent requests
      </Text>
      {sentRequests.map((request) => {
        const busy = busyUserId === String(request.id);
        return (
          <View key={String(request.id)} style={styles.requestRow}>
            <Avatar size={38} user={request} />
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>
                {request.username}
              </Text>
              <Text style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
                Pending
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Cancel friend request to ${request.username}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onCancel(String(request.id))}
              style={[
                styles.smallMutedButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.smallMutedText, { color: colors.secondaryForeground }]}>
                {busy ? "..." : "Cancel"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function Avatar({
  size = 46,
  user,
}: {
  size?: number;
  user?: { avatar_url?: string; username?: string; display_name?: string } | null;
}) {
  const { colors } = useMobileTheme();
  const label = user?.username || user?.display_name || "?";
  const image = user?.avatar_url;
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: colors.muted,
          borderColor: colors.border,
          borderRadius: radius,
          height: size,
          width: size,
        },
      ]}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={{
            borderRadius: radius,
            height: size,
            width: size,
          }}
        />
      ) : (
        <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
          {label.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function SearchBox({
  onChangeText,
  placeholder,
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const { colors } = useMobileTheme();

  return (
    <View
      style={[
        styles.searchBox,
        { backgroundColor: colors.input, borderColor: colors.border },
      ]}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.mutedForeground}
        importantForAccessibility="no-hide-descendants"
        name="search"
        size={17}
      />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.searchInput, { color: colors.foreground }]}
        value={value}
      />
    </View>
  );
}

function EmptyState({
  body,
  icon,
  title,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={styles.emptyState}>
      <Ionicons
        accessibilityElementsHidden
        color={colors.mutedForeground}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={36}
      />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  const { colors } = useMobileTheme();

  return (
    <View style={styles.emptyState}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function LoadingMore() {
  const { colors } = useMobileTheme();

  return (
    <View style={styles.loadingMore}>
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  );
}

function LoadMoreButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useMobileTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.loadMoreButton}
    >
      <Text style={[styles.loadMoreText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function getConversationTitle(conversation: UIConversation) {
  if (conversation.isGroup) return conversation.name || "Group conversation";
  return conversation.otherUser?.username || "Conversation";
}

function getLastMessagePreview(conversation: UIConversation) {
  if (!conversation.lastMessage) return "No messages yet";
  if (conversation.lastMessage.content) return conversation.lastMessage.content;
  if (conversation.lastMessage.audio_url) return "Audio message";
  return "Message";
}

function getTabLabel(tab: TabKey) {
  if (tab === "chats") return "Chats";
  if (tab === "friends") return "Friends";
  return "Find";
}

function formatShortDate(value?: string) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString();
}

function formatRelativeTime(value?: string) {
  if (!value) return "";
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return "";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date) / 1000));
  if (diffSeconds < 60) return "now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return new Date(value).toLocaleDateString();
}

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("DM_PRIVACY_RESTRICTED") || message.includes("only accepts")) {
    return "This user only accepts messages from friends.";
  }
  if (message.includes("already friends")) return "You are already friends.";
  if (message.includes("already sent")) return "Friend request already sent.";
  if (message.includes("Rate limit")) return "Slow down for a moment.";
  return message || "Something went wrong.";
}

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
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  requestBadge: {
    alignItems: "center",
    borderRadius: 8,
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  requestBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "800",
  },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "900",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  rowTime: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowSubtext: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  unreadDot: {
    borderRadius: 5,
    height: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    width: 10,
  },
  smallPrimaryButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 58,
    paddingHorizontal: 12,
  },
  smallPrimaryText: {
    fontSize: 12,
    fontWeight: "900",
  },
  smallMutedButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 68,
    paddingHorizontal: 12,
  },
  smallMutedText: {
    fontSize: 12,
    fontWeight: "900",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  sectionBlock: {
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    textTransform: "uppercase",
  },
  requestRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  searchBox: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 42,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 52,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "900",
  },
  loadingMore: {
    alignItems: "center",
    paddingVertical: 16,
  },
});
