import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type TabKey = "chats" | "friends" | "find";

type ConversationsReturn = FunctionReturnType<typeof api.messages.getConversationsPaginated>;
type ConversationItem = ConversationsReturn["page"][number];
type FriendsReturn = FunctionReturnType<typeof api.friends.listPaginated>;
type FriendItem = NonNullable<FriendsReturn["page"][number]>;
type RequestsReturn = FunctionReturnType<typeof api.friends.getRequestsPaginated>;
type RequestItem = NonNullable<RequestsReturn["page"][number]>;
type SentRequestsReturn = FunctionReturnType<typeof api.friends.getSentRequestsWithDataPaginated>;
type SentRequestItem = NonNullable<SentRequestsReturn["page"][number]>;
type UsersReturn = FunctionReturnType<typeof api.users.searchPaginated>;
type SearchUserItem = UsersReturn["page"][number];

const INITIAL_PAGE_SIZE = 25;

export default function MessagesScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>("chats");
  const [friendSearch, setFriendSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conversationsQuery = usePaginatedQuery(
    api.messages.getConversationsPaginated,
    {},
    { initialNumItems: INITIAL_PAGE_SIZE }
  );
  const friendsQuery = usePaginatedQuery(
    api.friends.listPaginated,
    { search: friendSearch.trim() || undefined },
    { initialNumItems: INITIAL_PAGE_SIZE }
  );
  const requestsQuery = usePaginatedQuery(
    api.friends.getRequestsPaginated,
    {},
    { initialNumItems: 10 }
  );
  const sentRequestsQuery = usePaginatedQuery(
    api.friends.getSentRequestsWithDataPaginated,
    {},
    { initialNumItems: 10 }
  );
  const usersQuery = usePaginatedQuery(
    api.users.searchPaginated,
    { search: userSearch.trim() || undefined },
    { initialNumItems: INITIAL_PAGE_SIZE }
  );

  const ensureDm = useMutation(api.messages.ensureDmWithUser);
  const sendFriendRequest = useMutation(api.friends.sendRequest);
  const acceptFriendRequest = useMutation(api.friends.acceptRequest);
  const removeFriend = useMutation(api.friends.remove);

  const friends = friendsQuery.results.filter(Boolean) as FriendItem[];
  const incomingRequests = requestsQuery.results.filter(Boolean) as RequestItem[];
  const sentRequests = sentRequestsQuery.results.filter(Boolean) as SentRequestItem[];
  const conversations = conversationsQuery.results;
  const users = usersQuery.results;

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
      const result = await ensureDm({ userId: userId as Id<"profiles"> });
      navigation.navigate("Conversation", {
        conversationId: result.conversationId,
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
      await sendFriendRequest({ friendId: userId as Id<"profiles"> });
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
      await acceptFriendRequest({ userId: userId as Id<"profiles"> });
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
      await removeFriend({ userId: userId as Id<"profiles"> });
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Inbox</Text>
          <Text style={styles.title}>Messages</Text>
        </View>
        {incomingRequests.length > 0 ? (
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>{incomingRequests.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(["chats", "friends", "find"] as TabKey[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              setError(null);
              setActiveTab(tab);
            }}
            style={[styles.tabButton, activeTab === tab ? styles.tabButtonActive : null]}
          >
            <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>
              {getTabLabel(tab)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {activeTab === "chats" ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            conversationsQuery.status === "LoadingFirstPage" ? (
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
            conversationsQuery.status === "CanLoadMore" ? (
              <LoadMoreButton
                label="Load more conversations"
                onPress={() => conversationsQuery.loadMore(INITIAL_PAGE_SIZE)}
              />
            ) : conversationsQuery.status === "LoadingMore" ? (
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
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.sectionLabel}>Friends</Text>
            </View>
          }
          ListEmptyComponent={
            friendsQuery.status === "LoadingFirstPage" ? (
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
            friendsQuery.status === "CanLoadMore" ? (
              <LoadMoreButton
                label="Load more friends"
                onPress={() => friendsQuery.loadMore(INITIAL_PAGE_SIZE)}
              />
            ) : friendsQuery.status === "LoadingMore" ? (
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
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.sectionLabel}>
                {userSearch.trim() ? "Search results" : "People"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            usersQuery.status === "LoadingFirstPage" ? (
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
            usersQuery.status === "CanLoadMore" ? (
              <LoadMoreButton
                label="Load more users"
                onPress={() => usersQuery.loadMore(INITIAL_PAGE_SIZE)}
              />
            ) : usersQuery.status === "LoadingMore" ? (
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
  conversation: ConversationItem;
  onPress: () => void;
}) {
  const title = getConversationTitle(conversation);
  const lastMessage = getLastMessagePreview(conversation);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
      <Avatar user={conversation.other_user ?? undefined} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {title}
          </Text>
          <Text style={styles.rowTime}>{formatRelativeTime(conversation.updated_at)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.rowSubtext}>
          {lastMessage}
        </Text>
      </View>
      {conversation.hasUnread ? <View style={styles.unreadDot} /> : null}
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
  friend: FriendItem;
  onMessage: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <Avatar user={friend} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {friend.username}
        </Text>
        <Text numberOfLines={1} style={styles.rowSubtext}>
          Friends since {formatShortDate(friend.friends_since)}
        </Text>
      </View>
      <Pressable disabled={busy} onPress={onMessage} style={styles.smallPrimaryButton}>
        <Text style={styles.smallPrimaryText}>{busy ? "..." : "DM"}</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={onRemove} style={styles.iconButton}>
        <Ionicons color="#8F98A8" name="person-remove-outline" size={17} />
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
  user: SearchUserItem;
}) {
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
    <View style={styles.row}>
      <Avatar user={user} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {user.username}
        </Text>
        <Text numberOfLines={1} style={styles.rowSubtext}>
          {user.display_name || "Jam user"}
        </Text>
      </View>
      <Pressable
        disabled={busy}
        onPress={action}
        style={[
          styles.smallPrimaryButton,
          hasSentRequest ? styles.smallMutedButton : null,
        ]}
      >
        <Text
          style={[
            styles.smallPrimaryText,
            hasSentRequest ? styles.smallMutedText : null,
          ]}
        >
          {busy ? "..." : actionLabel}
        </Text>
      </Pressable>
      {secondaryAction && secondaryIcon ? (
        <Pressable disabled={busy} onPress={secondaryAction} style={styles.iconButton}>
          <Ionicons color="#8F98A8" name={secondaryIcon} size={18} />
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
  incomingRequests: RequestItem[];
  onAccept: (userId: string) => void;
  onDecline: (userId: string) => void;
}) {
  if (incomingRequests.length === 0) return null;

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Friend requests</Text>
      {incomingRequests.map((request) => {
        const busy = busyUserId === String(request.id);
        return (
          <View key={String(request.id)} style={styles.requestRow}>
            <Avatar size={38} user={request} />
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {request.username}
              </Text>
              <Text style={styles.rowSubtext}>{formatRelativeTime(request.requested_at)}</Text>
            </View>
            <Pressable
              disabled={busy}
              onPress={() => onAccept(String(request.id))}
              style={styles.smallPrimaryButton}
            >
              <Text style={styles.smallPrimaryText}>{busy ? "..." : "Accept"}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => onDecline(String(request.id))}
              style={styles.iconButton}
            >
              <Ionicons color="#8F98A8" name="close" size={18} />
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
  sentRequests: SentRequestItem[];
}) {
  if (sentRequests.length === 0) return null;

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Sent requests</Text>
      {sentRequests.map((request) => {
        const busy = busyUserId === String(request.id);
        return (
          <View key={String(request.id)} style={styles.requestRow}>
            <Avatar size={38} user={request} />
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {request.username}
              </Text>
              <Text style={styles.rowSubtext}>Pending</Text>
            </View>
            <Pressable
              disabled={busy}
              onPress={() => onCancel(String(request.id))}
              style={styles.smallMutedButton}
            >
              <Text style={styles.smallMutedText}>{busy ? "..." : "Cancel"}</Text>
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
  const label = user?.username || user?.display_name || "?";
  const image = user?.avatar_url;
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
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
        <Text style={styles.avatarText}>{label.slice(0, 2).toUpperCase()}</Text>
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
  return (
    <View style={styles.searchBox}>
      <Ionicons color="#8F98A8" name="search" size={17} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7E8796"
        style={styles.searchInput}
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
  return (
    <View style={styles.emptyState}>
      <Ionicons color="#4B5565" name={icon} size={36} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <ActivityIndicator color="#D8A64A" />
      <Text style={styles.emptyBody}>{label}</Text>
    </View>
  );
}

function LoadingMore() {
  return (
    <View style={styles.loadingMore}>
      <ActivityIndicator color="#D8A64A" size="small" />
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
  return (
    <Pressable onPress={onPress} style={styles.loadMoreButton}>
      <Text style={styles.loadMoreText}>{label}</Text>
    </Pressable>
  );
}

function getConversationTitle(conversation: ConversationItem) {
  if (conversation.isGroup) return conversation.name || "Group conversation";
  return conversation.other_user?.username || "Conversation";
}

function getLastMessagePreview(conversation: ConversationItem) {
  if (!conversation.last_message) return "No messages yet";
  if (conversation.last_message.text) return conversation.last_message.text;
  if (conversation.last_message.audio_url) return "Audio message";
  return "Message";
}

function getTabLabel(tab: TabKey) {
  if (tab === "chats") return "Chats";
  if (tab === "friends") return "Friends";
  return "Find";
}

function formatShortDate(value: string) {
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
    backgroundColor: "#1A1E29",
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  eyebrow: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#EEF0F5",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  requestBadge: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  requestBadgeText: {
    color: "#251B0A",
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
    backgroundColor: "#222733",
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: "rgba(216,166,74,0.13)",
    borderColor: "rgba(216,166,74,0.35)",
  },
  tabText: {
    color: "#8F98A8",
    fontSize: 13,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#D8A64A",
  },
  errorBox: {
    backgroundColor: "rgba(127,29,29,0.5)",
    borderColor: "rgba(248,113,113,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    color: "#FECACA",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  row: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.07)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#303644",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    color: "#C7CCD6",
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
    color: "#EEF0F5",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  rowTime: {
    color: "#737D8C",
    fontSize: 11,
    fontWeight: "700",
  },
  rowSubtext: {
    color: "#8F98A8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  unreadDot: {
    backgroundColor: "#D8A64A",
    borderRadius: 5,
    height: 10,
    shadowColor: "#D8A64A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    width: 10,
  },
  smallPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#D8A64A",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 58,
    paddingHorizontal: 12,
  },
  smallPrimaryText: {
    color: "#251B0A",
    fontSize: 12,
    fontWeight: "900",
  },
  smallMutedButton: {
    alignItems: "center",
    backgroundColor: "#303644",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 68,
    paddingHorizontal: 12,
  },
  smallMutedText: {
    color: "#AEB6C4",
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
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sectionLabel: {
    color: "#8F98A8",
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
    backgroundColor: "#222733",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: "#EEF0F5",
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
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },
  emptyBody: {
    color: "#8F98A8",
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
    color: "#D8A64A",
    fontSize: 13,
    fontWeight: "900",
  },
  loadingMore: {
    alignItems: "center",
    paddingVertical: 16,
  },
});
