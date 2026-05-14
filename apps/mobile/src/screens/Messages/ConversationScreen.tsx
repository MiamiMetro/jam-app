import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPostPlayer from "@/components/posts/AudioPostPlayer";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  useConversationParticipants,
  useDeleteMessage,
  useMarkAsRead,
  useMessages,
  useSendMessage,
  type UIMessage,
} from "@/hooks/useUsers";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = NativeStackScreenProps<RootStackParamList, "Conversation">;
const MAX_MESSAGE_LENGTH = 300;

export default function ConversationScreen({ navigation, route }: Props) {
  const { colors } = useMobileTheme();
  const { conversationId } = route.params;
  const { profile } = useMyProfile();
  const listRef = useRef<FlatList<UIMessage>>(null);
  const skipNextAutoScrollRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesQuery = useMessages(profile?.id, conversationId);
  const participantsQuery = useConversationParticipants(conversationId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteMessage = useDeleteMessage();

  useEffect(() => {
    didInitialScrollRef.current = false;
    skipNextAutoScrollRef.current = false;
    setError(null);
  }, [conversationId]);

  useEffect(() => {
    if (messagesQuery.isLoading) return;
    const timer = setTimeout(() => {
      markAsRead.mutate(conversationId);
    }, 700);
    return () => clearTimeout(timer);
  }, [conversationId, markAsRead, messagesQuery.data.length, messagesQuery.isLoading]);

  const messages = messagesQuery.data;

  const otherParticipant = useMemo(
    () => participantsQuery.data.find((participant) => participant.id !== profile?.id) ?? null,
    [participantsQuery.data, profile?.id]
  );
  const title = route.params.title || otherParticipant?.username || "Conversation";

  useEffect(() => {
    if (messages.length === 0 || messagesQuery.isFetchingNextPage) return;
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: didInitialScrollRef.current });
      didInitialScrollRef.current = true;
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, messagesQuery.isFetchingNextPage]);

  const loadOlderMessages = async () => {
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;

    try {
      setError(null);
      skipNextAutoScrollRef.current = true;
      await messagesQuery.fetchNextPage();
    } catch (err) {
      setError(getFriendlyMessageError(err));
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending || text.length > MAX_MESSAGE_LENGTH) return;

    try {
      setIsSending(true);
      setError(null);
      setInput("");
      await sendMessage.mutateAsync({ conversationId, content: text });
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
      await deleteMessage.mutateAsync(messageId);
    } catch (err) {
      setError(getFriendlyMessageError(err));
    }
  };

  const isInitialLoading = messagesQuery.isLoading;
  const canSend = input.trim().length > 0 && input.length <= MAX_MESSAGE_LENGTH && !isSending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons
              accessibilityElementsHidden
              color={colors.secondaryForeground}
              importantForAccessibility="no-hide-descendants"
              name="arrow-back"
              size={20}
            />
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
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.mutedForeground}
                  importantForAccessibility="no-hide-descendants"
                  name="chatbubble-outline"
                  size={36}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No messages yet
                </Text>
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
                  Start the conversation.
                </Text>
              </View>
            }
            ListHeaderComponent={
              messagesQuery.hasNextPage ? (
                <Pressable
                  disabled={messagesQuery.isFetchingNextPage}
                  onPress={loadOlderMessages}
                  style={styles.loadOlderButton}
                >
                  {messagesQuery.isFetchingNextPage ? (
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
                isOwn={item.senderId === profile?.id}
                message={item}
                nextMessage={messages[index + 1]}
                onDelete={() => handleDelete(String(item.id))}
                otherParticipantLastRead={messagesQuery.otherParticipantLastRead ?? null}
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
            accessibilityLabel="Send message"
            accessibilityRole="button"
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
              <Ionicons
                accessibilityElementsHidden
                color={colors.primaryForeground}
                importantForAccessibility="no-hide-descendants"
                name="send"
                size={18}
              />
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
  message: UIMessage;
  nextMessage?: UIMessage;
  onDelete: () => void;
  otherParticipantLastRead: number | null;
}) {
  const { colors } = useMobileTheme();
  const shouldShowTime =
    !nextMessage ||
    nextMessage.senderId !== message.senderId ||
    getTimeGapMinutes(message.timestamp, nextMessage.timestamp) > 8;
  const isRead =
    isOwn &&
    otherParticipantLastRead != null &&
    message._creationTime != null &&
    message._creationTime <= otherParticipantLastRead;

  if (message.isDeleted) {
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
        <Pressable
          accessibilityLabel="Delete message"
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.messageDeleteButton}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.mutedForeground}
            importantForAccessibility="no-hide-descendants"
            name="trash-outline"
            size={14}
          />
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
        {message.content ? (
          <Text
            style={[
              styles.messageText,
              { color: isOwn ? colors.primaryForeground : colors.foreground },
              isOwn ? styles.ownMessageText : null,
            ]}
          >
            {message.content}
          </Text>
        ) : null}
        {message.audio_url ? (
          <AudioPostPlayer
            audioUrl={message.audio_url}
            style={[
              styles.audioMessage,
              {
                backgroundColor: isOwn ? colors.accentMuted : colors.input,
                borderColor: isOwn ? colors.ring : colors.border,
              },
            ]}
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
              {formatRelativeTime(message.timestamp)}
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

function getTimeGapMinutes(current?: string, next?: string) {
  if (!current || !next) return 0;
  const currentTime = new Date(current).getTime();
  const nextTime = new Date(next).getTime();
  if (Number.isNaN(currentTime) || Number.isNaN(nextTime)) return 0;
  return Math.abs(nextTime - currentTime) / 60000;
}

function formatRelativeTime(value?: string) {
  if (!value) return "now";
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
