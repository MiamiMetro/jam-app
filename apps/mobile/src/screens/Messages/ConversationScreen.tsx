import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useConvex, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AudioPostPlayer from "@/components/posts/AudioPostPlayer";
import { useMyProfile } from "@/hooks/useMyProfile";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useMobileTheme } from "@/theme/MobileTheme";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";

type Props = NativeStackScreenProps<RootStackParamList, "Conversation">;
type MessagesReturn = FunctionReturnType<typeof api.messages.getByConversationPaginated>;
type MessageItem = MessagesReturn["data"][number];

const PAGE_SIZE = 40;
const MAX_MESSAGE_LENGTH = 300;

export default function ConversationScreen({ navigation, route }: Props) {
  const { colors } = useMobileTheme();
  const { conversationId } = route.params;
  const convex = useConvex();
  const { profile } = useMyProfile();
  const listRef = useRef<FlatList<MessageItem>>(null);
  const skipNextAutoScrollRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [olderMessages, setOlderMessages] = useState<MessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const firstPage = useQuery(api.messages.getByConversationPaginated, {
    conversationId: conversationId as Id<"conversations">,
    limit: PAGE_SIZE,
  });
  const participants = useQuery(api.messages.getParticipants, {
    conversationId: conversationId as Id<"conversations">,
  });
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);
  const deleteMessage = useMutation(api.messages.remove);

  useEffect(() => {
    didInitialScrollRef.current = false;
    skipNextAutoScrollRef.current = false;
    setOlderMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setIsLoadingOlder(false);
    setError(null);
  }, [conversationId]);

  useEffect(() => {
    if (!firstPage) return;
    if (olderMessages.length === 0) {
      setNextCursor(firstPage.nextCursor ?? null);
      setHasMore(firstPage.hasMore ?? false);
    }
  }, [firstPage, olderMessages.length]);

  useEffect(() => {
    if (!firstPage) return;
    const timer = setTimeout(() => {
      markAsRead({ conversationId: conversationId as Id<"conversations"> }).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [conversationId, firstPage?.data.length, markAsRead, firstPage]);

  const messages = useMemo(() => {
    const latestMessages = firstPage?.data ?? [];
    return mergeMessages(olderMessages, latestMessages);
  }, [firstPage?.data, olderMessages]);

  const otherParticipant = useMemo(
    () => participants?.find((participant) => participant.id !== profile?.id) ?? null,
    [participants, profile?.id]
  );
  const title = route.params.title || otherParticipant?.username || "Conversation";

  useEffect(() => {
    if (messages.length === 0 || isLoadingOlder) return;
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: didInitialScrollRef.current });
      didInitialScrollRef.current = true;
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, isLoadingOlder]);

  const loadOlderMessages = async () => {
    if (!nextCursor || isLoadingOlder || !hasMore) return;

    try {
      setIsLoadingOlder(true);
      setError(null);
      const result = await convex.query(api.messages.getByConversationPaginated, {
        conversationId: conversationId as Id<"conversations">,
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      skipNextAutoScrollRef.current = true;
      setOlderMessages((previous) => mergeMessages(result.data, previous));
      setNextCursor(result.nextCursor ?? null);
      setHasMore(result.hasMore ?? false);
    } catch (err) {
      setError(getFriendlyMessageError(err));
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending || text.length > MAX_MESSAGE_LENGTH) return;

    try {
      setIsSending(true);
      setError(null);
      setInput("");
      await sendMessage({
        conversationId: conversationId as Id<"conversations">,
        text,
      });
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    } catch (err) {
      setInput(text);
      setError(getFriendlyMessageError(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      setError(null);
      await deleteMessage({ messageId: messageId as Id<"messages"> });
    } catch (err) {
      setError(getFriendlyMessageError(err));
    }
  };

  const isInitialLoading = firstPage === undefined;
  const canSend = input.trim().length > 0 && input.length <= MAX_MESSAGE_LENGTH && !isSending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons color={colors.secondaryForeground} name="arrow-back" size={20} />
          </Pressable>
          <Avatar user={otherParticipant} />
          <View style={styles.headerTitleWrap}>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>
              {title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              Direct message
            </Text>
          </View>
        </View>

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.destructiveMuted,
                borderBottomColor: colors.destructive,
              },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 ? styles.messagesContentEmpty : null,
            ]}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyConversation}>
                <Ionicons color={colors.mutedForeground} name="chatbubble-outline" size={36} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No messages yet
                </Text>
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                  Start the conversation.
                </Text>
              </View>
            }
            ListHeaderComponent={
              hasMore ? (
                <Pressable
                  disabled={isLoadingOlder}
                  onPress={loadOlderMessages}
                  style={styles.loadOlderButton}
                >
                  {isLoadingOlder ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={[styles.loadOlderText, { color: colors.primary }]}>
                      Load older messages
                    </Text>
                  )}
                </Pressable>
              ) : null
            }
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            renderItem={({ item, index }) => (
              <MessageBubble
                isOwn={item.sender_id === profile?.id}
                message={item}
                nextMessage={messages[index + 1]}
                onDelete={() => handleDelete(String(item.id))}
                otherParticipantLastRead={firstPage?.otherParticipantLastRead ?? null}
              />
            )}
          />
        )}

        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <TextInput
              editable={!isSending}
              maxLength={MAX_MESSAGE_LENGTH}
              multiline
              onChangeText={setInput}
              placeholder="Start a new message"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              value={input}
            />
            {input.length > MAX_MESSAGE_LENGTH * 0.8 ? (
              <Text style={[styles.counter, { color: colors.mutedForeground }]}>
                {input.length}/{MAX_MESSAGE_LENGTH}
              </Text>
            ) : null}
          </View>
          <Pressable
            disabled={!canSend}
            onPress={handleSend}
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? colors.primary : colors.muted },
            ]}
          >
            {isSending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Ionicons color={colors.primaryForeground} name="send" size={18} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  isOwn,
  message,
  nextMessage,
  onDelete,
  otherParticipantLastRead,
}: {
  isOwn: boolean;
  message: MessageItem;
  nextMessage?: MessageItem;
  onDelete: () => void;
  otherParticipantLastRead: number | null;
}) {
  const { colors } = useMobileTheme();
  const shouldShowTime =
    !nextMessage ||
    nextMessage.sender_id !== message.sender_id ||
    getTimeGapMinutes(message.created_at, nextMessage.created_at) > 8;
  const isRead =
    isOwn &&
    otherParticipantLastRead != null &&
    message._creationTime != null &&
    message._creationTime <= otherParticipantLastRead;

  if (message.deleted_at) {
    return (
      <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : null]}>
        <Text style={[styles.deletedMessage, { color: colors.mutedForeground }]}>
          Message removed
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : null]}>
      {isOwn ? (
        <Pressable onPress={onDelete} style={styles.messageDeleteButton}>
          <Ionicons color={colors.mutedForeground} name="trash-outline" size={14} />
        </Pressable>
      ) : null}
      <View
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: colors.primary }
            : {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
              },
        ]}
      >
        {message.text ? (
          <Text
            style={[
              styles.messageText,
              { color: isOwn ? colors.primaryForeground : colors.foreground },
              isOwn ? styles.ownMessageText : null,
            ]}
          >
            {message.text}
          </Text>
        ) : null}
        {message.audio_url ? (
          <AudioPostPlayer
            audioUrl={message.audio_url}
            style={styles.audioMessage}
            title="Audio message"
          />
        ) : null}
        {shouldShowTime ? (
          <View style={[styles.messageMeta, isOwn ? styles.messageMetaOwn : null]}>
            <Text
              style={[
                styles.messageTime,
                {
                  color: isOwn
                    ? `${colors.primaryForeground}99`
                    : colors.mutedForeground,
                },
              ]}
            >
              {formatRelativeTime(message.created_at)}
            </Text>
            {isOwn ? (
              <View
                style={[
                  styles.readDot,
                  {
                    backgroundColor: isRead
                      ? colors.success
                      : `${colors.primaryForeground}59`,
                  },
                ]}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Avatar({
  user,
}: {
  user?: { avatar_url?: string; username?: string; display_name?: string } | null;
}) {
  const { colors } = useMobileTheme();
  const label = user?.username || user?.display_name || "?";
  const image = user?.avatar_url;

  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.avatarImage} />
      ) : (
        <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
          {label.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function mergeMessages(...messageGroups: MessageItem[][]) {
  const seen = new Set<string>();
  const merged: MessageItem[] = [];

  for (const message of messageGroups.flat()) {
    const id = String(message.id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(message);
  }

  return merged.sort(
    (a, b) =>
      (a._creationTime ?? new Date(a.created_at).getTime()) -
      (b._creationTime ?? new Date(b.created_at).getTime())
  );
}

function getTimeGapMinutes(current: string, next: string) {
  const currentTime = new Date(current).getTime();
  const nextTime = new Date(next).getTime();
  if (Number.isNaN(currentTime) || Number.isNaN(nextTime)) return 0;
  return Math.abs(nextTime - currentTime) / 60000;
}

function formatRelativeTime(value: string) {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return "now";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date) / 1000));
  if (diffSeconds < 60) return "now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  return new Date(value).toLocaleDateString();
}

function getFriendlyMessageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("DM_PRIVACY_RESTRICTED") || message.includes("only accepts")) {
    return "This user only accepts messages from friends.";
  }
  if (message.includes("Rate limit")) return "Slow down for a moment.";
  if (message.includes("Conversation not found")) return "Conversation not found.";
  return message || "Message failed.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  avatarImage: {
    height: 40,
    width: 40,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "900",
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  errorBox: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messagesContentEmpty: {
    flexGrow: 1,
  },
  emptyConversation: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },
  loadOlderButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  loadOlderText: {
    fontSize: 12,
    fontWeight: "900",
  },
  messageRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-start",
    marginBottom: 7,
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  bubble: {
    borderRadius: 8,
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownMessageText: {
    fontWeight: "700",
  },
  audioMessage: {
    backgroundColor: "rgba(0,0,0,0.14)",
    borderColor: "rgba(0,0,0,0.09)",
    minWidth: 230,
  },
  messageMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 5,
  },
  messageMetaOwn: {
    justifyContent: "flex-end",
  },
  messageTime: {
    fontSize: 10,
    fontWeight: "700",
  },
  readDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  messageDeleteButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  deletedMessage: {
    fontSize: 12,
    fontStyle: "italic",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  composer: {
    alignItems: "flex-end",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrap: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: 15,
    maxHeight: 100,
    minHeight: 26,
    padding: 0,
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  sendButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
