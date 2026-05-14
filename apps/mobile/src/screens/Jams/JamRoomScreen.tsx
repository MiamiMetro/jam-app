import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import JamStreamPlayer from "@/components/jams/JamStreamPlayer";
import { useJamRoomPresence } from "@/hooks/useJamRoomPresence";
import {
  useRoom,
  useRoomModeration,
  useRoomMessages,
  useRoomParticipants,
  useSendRoomMessage,
  useRequestRoomAccess,
  useDecideRoomAccessRequest,
  useRevokeRoomAccessGrant,
} from "@/hooks/useRooms";
import { useReportContent } from "@/hooks/usePosts";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMobileTheme } from "@/theme/MobileTheme";
import type { RoomParticipant } from "@/types";
import type { RootStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "JamRoom">;

export default function JamRoomScreen({ navigation, route }: Props) {
  const { colors } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const { handle } = route.params;
  const { profile } = useMyProfile();
  const { room, isLoading } = useRoom(handle);
  const { participants, totalCount } = useRoomParticipants(room?.id);
  const isHost = Boolean(profile?.id && room?.host_id === profile.id);
  const { data: moderation } = useRoomModeration(room?.id, isHost);
  const roomMessages = useRoomMessages(room?.id);
  const sendRoomMessage = useSendRoomMessage();
  const requestRoomAccess = useRequestRoomAccess();
  const decideAccessRequest = useDecideRoomAccessRequest();
  const revokeAccessGrant = useRevokeRoomAccessGrant();
  const reportContent = useReportContent();
  const presence = useJamRoomPresence(
    room?.id,
    Boolean(room?.is_active && room.viewer_access?.can_listen),
  );
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [roomPanel, setRoomPanel] = useState<"listeners" | "requests" | "approved">("listeners");
  const [requestingAccess, setRequestingAccess] = useState<"listen" | "jam" | null>(null);
  const hostName = room?.host?.display_name || room?.host?.username || "Unknown host";
  const canReportRoom = Boolean(profile?.id && room?.host_id !== profile.id);
  const canSendMessage =
    Boolean(room?.is_active) && message.trim().length > 0 && !isSendingMessage;

  const handleSendMessage = async () => {
    if (!room || !canSendMessage) return;

    try {
      setMessageError(null);
      setIsSendingMessage(true);
      await sendRoomMessage({
        roomId: room.id,
        text: message.trim(),
      });
      setMessage("");
    } catch (err) {
      setMessageError(getRoomMessageError(err));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleRequestAccess = async (type: "listen" | "jam") => {
    if (!room) return;
    setRequestingAccess(type);
    try {
      await requestRoomAccess({ roomId: room.id, type });
    } finally {
      setRequestingAccess(null);
    }
  };

  const handleReportRoom = async () => {
    if (!room) return;
    Alert.alert("Report room", "Send this jam room to Jam for review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          await reportContent.mutateAsync({
            targetType: "room",
            targetId: room.id,
            reason: "other",
          });
          setReportSubmitted(true);
          setTimeout(() => setReportSubmitted(false), 1000);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header onBack={navigation.goBack} title="Jam room" />
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Room is loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header onBack={navigation.goBack} title="Room not found" />
        <View style={styles.centerState}>
          <Ionicons color={colors.mutedForeground} name="musical-notes-outline" size={38} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Room not found</Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>This jam may have ended or moved.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        meta={`jam/${room.handle}`}
        onBack={navigation.goBack}
        onReport={canReportRoom ? handleReportRoom : undefined}
        reportSubmitted={reportSubmitted}
        title={room.name}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTopLine}>
            <View style={styles.hostIdentity}>
              <Avatar
                image={room.host?.avatar_url}
                label={room.host?.username ?? room.handle}
                size={48}
              />
              <View style={styles.hostText}>
                <Text numberOfLines={1} style={[styles.hostName, { color: colors.foreground }]}>
                  {hostName}
                </Text>
                <Text numberOfLines={1} style={[styles.hostSubtext, { color: colors.mutedForeground }]}>
                  Listener mode
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.liveBadge,
                {
                  backgroundColor: room.status === "live" ? colors.destructiveMuted : colors.muted,
                },
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: room.status === "live" ? colors.destructive : colors.mutedForeground },
                ]}
              />
              <Text
                style={[
                  styles.liveText,
                  { color: room.status === "live" ? colors.destructive : colors.mutedForeground },
                ]}
              >
                {room.status === "live" ? "Live" : "Idle"}
              </Text>
            </View>
          </View>

          {room.description ? (
            <Text style={[styles.description, { color: colors.secondaryForeground }]}>{room.description}</Text>
          ) : null}

          <View style={styles.detailRow}>
            <DetailPill icon="people-outline" label={`${totalCount} listeners`} />
            <DetailPill icon="person-add-outline" label={`${room.max_performers} max performers`} />
            {room.genre ? <DetailPill label={room.genre} /> : null}
            {room.is_private ? <DetailPill icon="lock-closed-outline" label="Private" /> : null}
          </View>

          {!isHost && profile?.id && room.viewer_access && (!room.viewer_access.can_listen || !room.viewer_access.can_jam) ? (
            <View style={[styles.accessBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.accessText, { color: colors.secondaryForeground }]}>
                {!room.viewer_access.can_listen
                  ? "Listening requires host approval."
                  : "Jamming requires host approval."}
              </Text>
              {!room.viewer_access.can_listen ? (
                <Pressable
                  disabled={room.viewer_access.listen_request_status === "pending" || requestingAccess === "listen"}
                  onPress={() => handleRequestAccess("listen")}
                  style={[styles.accessButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.accessButtonText, { color: colors.primaryForeground }]}>
                    {room.viewer_access.listen_request_status === "pending" ? "Requested" : "Request Access"}
                  </Text>
                </Pressable>
              ) : !room.viewer_access.can_jam && room.jam_access === "approved" ? (
                <Pressable
                  disabled={room.viewer_access.jam_request_status === "pending" || requestingAccess === "jam"}
                  onPress={() => handleRequestAccess("jam")}
                  style={[styles.accessButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.accessButtonText, { color: colors.primaryForeground }]}>
                    {room.viewer_access.jam_request_status === "pending" ? "Requested" : "Request to Jam"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : presence.error ? (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: colors.destructiveMuted,
                  borderColor: colors.destructive,
                },
              ]}
            >
              <Ionicons
                accessibilityElementsHidden
                color={colors.destructive}
                importantForAccessibility="no-hide-descendants"
                name="alert-circle-outline"
                size={16}
              />
              <Text style={[styles.warningText, { color: colors.destructive }]}>
                {presence.error}
              </Text>
            </View>
          ) : (
            <View style={styles.presenceLine}>
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: presence.isConnected ? colors.success : colors.mutedForeground },
                ]}
              />
              <Text style={[styles.presenceText, { color: colors.mutedForeground }]}>
                {presence.isConnected ? "Joined as listener" : "Joining listener presence..."}
              </Text>
            </View>
          )}
        </View>

        <JamStreamPlayer roomName={room.name} streamUrl={room.stream_url} />

        <View style={[styles.infoBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chat</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {roomMessages.data.length} latest
            </Text>
          </View>

          <View style={styles.chatList}>
            {roomMessages.isLoading ? (
              <View style={styles.emptyParticipants}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : roomMessages.data.length === 0 ? (
              <Text style={[styles.emptyParticipantsText, { color: colors.mutedForeground }]}>
                No room messages yet.
              </Text>
            ) : (
              roomMessages.data.map((item) => (
                <View key={item.id} style={[styles.chatMessage, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.chatSender, { color: colors.foreground }]}>
                    {item.sender?.username || "Unknown"}
                  </Text>
                  <Text style={[styles.chatText, { color: colors.secondaryForeground }]}>
                    {item.text}
                  </Text>
                </View>
              ))
            )}
          </View>

          {messageError ? (
            <Text
              style={[
                styles.messageError,
                {
                  backgroundColor: colors.destructiveMuted,
                  borderColor: colors.destructive,
                  color: colors.destructive,
                },
              ]}
            >
              {messageError}
            </Text>
          ) : null}

          <View style={[styles.chatComposer, { borderTopColor: colors.border }]}>
            <TextInput
              editable={Boolean(room.is_active) && !isSendingMessage}
              maxLength={500}
              onChangeText={(value) => {
                setMessage(value);
                setMessageError(null);
              }}
              placeholder={room.is_active ? "Message this room" : "Room is idle"}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.chatInput,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.borderStrong,
                  color: colors.foreground,
                },
              ]}
              value={message}
            />
            <Pressable
              accessibilityLabel="Send room message"
              accessibilityRole="button"
              disabled={!canSendMessage}
              onPress={handleSendMessage}
              style={[
                styles.sendButton,
                { backgroundColor: canSendMessage ? colors.primary : colors.muted },
              ]}
            >
              {isSendingMessage ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text
                  style={[
                    styles.sendButtonText,
                    {
                      color: canSendMessage
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  Send
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.infoBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Room Moderation</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {roomPanel === "listeners"
                ? `${participants.length} shown`
                : roomPanel === "requests"
                  ? `${moderation.pending.length} pending`
                  : `${moderation.approved.length} approved`}
            </Text>
          </View>

          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {(["listeners", "requests", "approved"] as const).map((tab) => {
              if (!isHost && tab !== "listeners") return null;
              const active = roomPanel === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setRoomPanel(tab)}
                  style={[styles.tabButton, { backgroundColor: active ? colors.accentMuted : "transparent" }]}
                >
                  <Text style={[styles.tabButtonText, { color: active ? colors.primary : colors.mutedForeground }]}>
                    {tab === "listeners" ? "Listeners" : tab === "requests" ? "Requests" : "Approved"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {roomPanel === "listeners" && participants.length === 0 ? (
            <View style={styles.emptyParticipants}>
              <Text style={[styles.emptyParticipantsText, { color: colors.mutedForeground }]}>No listeners visible yet.</Text>
            </View>
          ) : roomPanel === "listeners" ? (
            participants.map((participant) => (
              <ParticipantRow
                isHost={participant.profile_id === room.host_id}
                key={participant.profile_id}
                participant={participant}
              />
            ))
          ) : isHost && roomPanel === "requests" ? (
            moderation.pending.length === 0 ? (
              <Text style={[styles.emptyParticipantsText, { color: colors.mutedForeground }]}>No pending requests.</Text>
            ) : (
              moderation.pending.map((request) => (
                <ModerationRow
                  key={request.id}
                  name={request.requester?.display_name || request.requester?.username || "Unknown"}
                  avatar={request.requester?.avatar_url}
                  detail={`wants to ${request.type === "jam" ? "jam" : "listen"}`}
                  primaryLabel="Approve"
                  secondaryLabel="Reject"
                  onPrimary={() => decideAccessRequest({ requestId: request.id, decision: "approved" })}
                  onSecondary={() => decideAccessRequest({ requestId: request.id, decision: "rejected" })}
                />
              ))
            )
          ) : isHost ? (
            moderation.approved.length === 0 ? (
              <Text style={[styles.emptyParticipantsText, { color: colors.mutedForeground }]}>No approved people yet.</Text>
            ) : (
              moderation.approved.map((grant) => (
                <ModerationRow
                  key={grant.id}
                  name={grant.profile?.display_name || grant.profile?.username || "Unknown"}
                  avatar={grant.profile?.avatar_url}
                  detail={`can ${grant.type === "jam" ? "jam" : "listen"}`}
                  secondaryLabel="Revoke"
                  onSecondary={() => revokeAccessGrant({ grantId: grant.id })}
                />
              ))
            )
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  meta,
  onBack,
  onReport,
  reportSubmitted,
  title,
}: {
  meta?: string;
  onBack: () => void;
  onReport?: () => void;
  reportSubmitted?: boolean;
  title: string;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityLabel="Back to jams"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.backButton}
      >
        <Ionicons
          accessibilityElementsHidden
          color={colors.secondaryForeground}
          importantForAccessibility="no-hide-descendants"
          name="chevron-back"
          size={22}
        />
      </Pressable>
      <View style={styles.headerText}>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {meta ? (
          <Text numberOfLines={1} style={[styles.headerMeta, { color: colors.mutedForeground }]}>
            {meta}
          </Text>
        ) : null}
      </View>
      {onReport ? (
        <Pressable
          accessibilityLabel="Report room"
          accessibilityRole="button"
          onPress={onReport}
          style={styles.backButton}
        >
          <Ionicons
            color={reportSubmitted ? colors.success : colors.mutedForeground}
            name={reportSubmitted ? "checkmark" : "flag-outline"}
            size={18}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function DetailPill({
  icon,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.detailPill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      {icon ? (
        <Ionicons
          accessibilityElementsHidden
          color={colors.mutedForeground}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={13}
        />
      ) : null}
      <Text numberOfLines={1} style={[styles.detailPillText, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function getRoomMessageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("NOT_IN_ROOM")) {
    return "Join listener mode before sending messages.";
  }
  if (message.includes("PRIVATE_ROOM")) {
    return "This room is friends only.";
  }
  if (message.includes("ROOM_NOT_ACTIVE")) {
    return "This room is not accepting messages right now.";
  }
  if (message.includes("EMPTY_MESSAGE")) {
    return "Write a message first.";
  }
  if (message.includes("Rate limit")) {
    return "Slow down before sending another message.";
  }

  return message.replace(/^[A-Z_]+:\s*/, "") || "Message failed.";
}

function ParticipantRow({
  isHost,
  participant,
}: {
  isHost: boolean;
  participant: RoomParticipant;
}) {
  const { colors } = useMobileTheme();
  const profile = participant.profile;
  const name = profile?.display_name || profile?.username || "Unknown";
  const username = profile?.username || "listener";

  return (
    <View style={[styles.participantRow, { borderBottomColor: colors.border }]}>
      <Avatar image={profile?.avatar_url} label={username} size={38} />
      <View style={styles.participantText}>
        <View style={styles.participantNameLine}>
          <Text numberOfLines={1} style={[styles.participantName, { color: colors.foreground }]}>
            {name}
          </Text>
          {isHost ? (
            <View style={[styles.hostBadge, { backgroundColor: colors.accentMuted }]}>
              <Text style={[styles.hostBadgeText, { color: colors.primary }]}>Host</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.participantRole, { color: colors.mutedForeground }]}>
          {participant.role}
        </Text>
      </View>
    </View>
  );
}

function ModerationRow({
  avatar,
  detail,
  name,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
}: {
  avatar?: string | null;
  detail: string;
  name: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.participantRow, { borderBottomColor: colors.border }]}>
      <Avatar image={avatar} label={name} size={38} />
      <View style={styles.participantText}>
        <Text numberOfLines={1} style={[styles.participantName, { color: colors.foreground }]}>
          {name}
        </Text>
        <Text numberOfLines={1} style={[styles.participantRole, { color: colors.mutedForeground }]}>
          {detail}
        </Text>
      </View>
      {primaryLabel ? (
        <Pressable onPress={onPrimary} style={[styles.smallActionButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.smallActionText, { color: colors.primaryForeground }]}>
            {primaryLabel}
          </Text>
        </Pressable>
      ) : null}
      {secondaryLabel ? (
        <Pressable onPress={onSecondary} style={[styles.smallActionButton, { backgroundColor: colors.muted }]}>
          <Text style={[styles.smallActionText, { color: colors.secondaryForeground }]}>
            {secondaryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Avatar({
  image,
  label,
  size,
}: {
  image?: string | null;
  label: string;
  size: number;
}) {
  const { colors } = useMobileTheme();
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          borderRadius: radius,
          backgroundColor: colors.muted,
          borderColor: colors.border,
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
        <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>{label.slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  content: {
    gap: 12,
    padding: 14,
    paddingBottom: 24,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    textAlign: "center",
  },
  hero: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  heroTopLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  hostIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "900",
  },
  hostText: {
    flex: 1,
    minWidth: 0,
  },
  hostName: {
    fontSize: 16,
    fontWeight: "900",
  },
  hostSubtext: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  liveBadge: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "900",
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailPill: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  detailPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  warningBox: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  accessBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  accessText: {
    fontSize: 12,
    fontWeight: "800",
  },
  accessButton: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  accessButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  presenceLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  presenceDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  presenceText: {
    fontSize: 12,
    fontWeight: "800",
  },
  infoBlock: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  sectionMeta: {
    fontSize: 11,
    fontWeight: "800",
  },
  tabRow: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  emptyParticipants: {
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  emptyParticipantsText: {
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 18,
    textAlign: "center",
  },
  chatList: {
    maxHeight: 280,
  },
  chatMessage: {
    borderBottomWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatSender: {
    fontSize: 12,
    fontWeight: "900",
  },
  chatText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  messageError: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chatComposer: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  chatInput: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  sendButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 70,
    paddingHorizontal: 12,
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  participantRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  participantText: {
    flex: 1,
    minWidth: 0,
  },
  participantNameLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  participantRole: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
    textTransform: "capitalize",
  },
  hostBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  smallActionButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: "900",
  },
});
