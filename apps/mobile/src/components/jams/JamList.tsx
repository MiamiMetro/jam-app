import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { FriendInRoomItem, MyRoom, RoomFeedItem } from "@/types";
import JamItem from "./JamItem";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  friendsInRooms?: FriendInRoomItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  isMyRoomLoading?: boolean;
  myRoom?: MyRoom | null;
  onEndReached?: () => void;
  onOpenRoom?: (room: RoomFeedItem) => void;
  onOpenRoomHandle?: (handle: string) => void;
  onSearchChange?: (value: string) => void;
  rooms: RoomFeedItem[];
  searchValue?: string;
};

export default function JamList({
  friendsInRooms = [],
  isLoading = false,
  isLoadingMore = false,
  isMyRoomLoading = false,
  myRoom,
  onEndReached,
  onOpenRoom,
  onOpenRoomHandle,
  onSearchChange,
  rooms,
  searchValue = "",
}: Props) {
  const { colors } = useMobileTheme();
  const hasSearch = searchValue.trim().length > 0;

  return (
    <FlatList
      contentContainerStyle={[
        styles.content,
        { backgroundColor: colors.background },
        rooms.length === 0 ? styles.emptyContent : null,
      ]}
      data={rooms}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <EmptyState
          isLoading={isLoading}
          message={
            hasSearch
              ? "Try another room name, handle, or vibe."
              : "No active jams right now."
          }
          title={hasSearch ? "No jams found" : "Quiet for the moment"}
        />
      }
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
        ) : null
      }
      ListHeaderComponent={
        <View>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
                Live Rooms
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Jams</Text>
            </View>
            <View
              style={[
                styles.liveCount,
                { backgroundColor: colors.accentMuted, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.liveCountNumber, { color: colors.primary }]}>
                {rooms.length}
              </Text>
              <Text style={[styles.liveCountLabel, { color: colors.secondaryForeground }]}>
                live
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Ionicons color={colors.mutedForeground} name="search" size={17} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={onSearchChange}
              placeholder="Search jams..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              value={searchValue}
            />
            {searchValue ? (
              <Pressable
                accessibilityLabel="Clear jam search"
                onPress={() => onSearchChange?.("")}
                style={styles.clearSearchButton}
              >
                <Ionicons color={colors.mutedForeground} name="close" size={17} />
              </Pressable>
            ) : null}
          </View>

          <MyRoomSummary
            isLoading={isMyRoomLoading}
            onOpenRoomHandle={onOpenRoomHandle}
            room={myRoom}
          />
          <FriendsJammingNow
            friendsInRooms={friendsInRooms}
            onOpenRoomHandle={onOpenRoomHandle}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Live Rooms
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {isLoading ? "Loading" : `${rooms.length} shown`}
            </Text>
          </View>
        </View>
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => <JamItem onPress={() => onOpenRoom?.(item)} room={item} />}
    />
  );
}

function MyRoomSummary({
  isLoading,
  onOpenRoomHandle,
  room,
}: {
  isLoading: boolean;
  onOpenRoomHandle?: (handle: string) => void;
  room?: MyRoom | null;
}) {
  const { colors } = useMobileTheme();

  if (isLoading) {
    return (
      <View
        style={[
          styles.myRoomCard,
          { backgroundColor: colors.input, borderColor: colors.border },
        ]}
      >
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={[styles.myRoomLoading, { color: colors.mutedForeground }]}>
          Your room is loading...
        </Text>
      </View>
    );
  }

  if (!room) return null;

  const statusLabel = room.is_active ? "Active" : "Disabled";

  return (
    <Pressable
      disabled={!room.is_active}
      onPress={() => onOpenRoomHandle?.(room.handle)}
      style={({ pressed }) => [
        styles.myRoomCard,
        {
          backgroundColor: pressed ? colors.cardPressed : colors.input,
          borderColor: room.is_active ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.myRoomTopLine}>
        <View style={styles.myRoomTitleWrap}>
          <Ionicons color={colors.mutedForeground} name="home-outline" size={15} />
          <Text style={[styles.myRoomLabel, { color: colors.mutedForeground }]}>
            My Room
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: room.is_active
                ? "rgba(34,197,94,0.12)"
                : colors.muted,
            },
          ]}
        >
          <View style={[styles.statusDot, room.is_active ? styles.statusDotActive : null]} />
          <Text
            style={[
              styles.statusText,
              { color: room.is_active ? colors.success : colors.secondaryForeground },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text numberOfLines={1} style={[styles.myRoomName, { color: colors.foreground }]}>
        {room.name}
      </Text>
      {room.description ? (
        <Text
          numberOfLines={2}
          style={[styles.myRoomDescription, { color: colors.secondaryForeground }]}
        >
          {room.description}
        </Text>
      ) : null}

      <View style={styles.detailRow}>
        <DetailPill icon="people-outline" label={`${room.participant_count} listeners`} />
        <DetailPill icon="person-add-outline" label={`${room.max_performers} performers`} />
        {room.genre ? <DetailPill label={room.genre} /> : null}
        {room.is_private ? <DetailPill icon="lock-closed-outline" label="Private" /> : null}
      </View>
    </Pressable>
  );
}

function FriendsJammingNow({
  friendsInRooms,
  onOpenRoomHandle,
}: {
  friendsInRooms: FriendInRoomItem[];
  onOpenRoomHandle?: (handle: string) => void;
}) {
  const { colors } = useMobileTheme();

  if (friendsInRooms.length === 0) return null;

  return (
    <View style={styles.friendsBlock}>
      <Text style={[styles.friendsTitle, { color: colors.mutedForeground }]}>
        Friends Jamming Now
      </Text>
      <ScrollView
        contentContainerStyle={styles.friendsContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {friendsInRooms.slice(0, 8).map((item) => (
          <Pressable
            key={`${item.friend.id}-${item.room_id}`}
            onPress={() => onOpenRoomHandle?.(item.room_handle)}
            style={({ pressed }) => [
              styles.friendChip,
              {
                backgroundColor: pressed ? colors.cardPressed : colors.input,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.friendAvatar,
                { backgroundColor: colors.muted, borderColor: colors.success },
              ]}
            >
              <Text style={[styles.friendAvatarText, { color: colors.secondaryForeground }]}>
                {item.friend.username.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.friendChipTextWrap}>
              <Text numberOfLines={1} style={[styles.friendName, { color: colors.foreground }]}>
                {item.friend.username}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.friendRoom, { color: colors.mutedForeground }]}
              >
                {item.room_name}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
    <View
      style={[
        styles.detailPill,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      {icon ? <Ionicons color={colors.mutedForeground} name={icon} size={13} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.detailPillText, { color: colors.secondaryForeground }]}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyState({
  isLoading,
  message,
  title,
}: {
  isLoading: boolean;
  message: string;
  title: string;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={styles.emptyState}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons color={colors.mutedForeground} name="musical-notes-outline" size={38} />
      )}
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {isLoading ? "Loading jams..." : title}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
        {isLoading ? "Finding live rooms." : message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: "#1A1E29",
    paddingBottom: 18,
  },
  emptyContent: {
    flexGrow: 1,
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
  headerCopy: {
    flex: 1,
    minWidth: 0,
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
  liveCount: {
    alignItems: "center",
    backgroundColor: "rgba(216,166,74,0.13)",
    borderColor: "rgba(216,166,74,0.34)",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveCountNumber: {
    color: "#D8A64A",
    fontSize: 16,
    fontWeight: "900",
  },
  liveCountLabel: {
    color: "#AEB6C4",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
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
    marginTop: 12,
    paddingLeft: 12,
    paddingRight: 6,
  },
  searchInput: {
    color: "#EEF0F5",
    flex: 1,
    fontSize: 14,
    minHeight: 42,
  },
  clearSearchButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  myRoomCard: {
    backgroundColor: "#222733",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
  },
  myRoomActive: {
    borderColor: "rgba(216,166,74,0.34)",
  },
  myRoomPressed: {
    backgroundColor: "#262C39",
  },
  myRoomLoading: {
    color: "#8F98A8",
    fontSize: 13,
    fontWeight: "700",
  },
  myRoomTopLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  myRoomTitleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  myRoomLabel: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#303644",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillActive: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  statusDot: {
    backgroundColor: "#737D8C",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusDotActive: {
    backgroundColor: "#22C55E",
  },
  statusText: {
    color: "#AEB6C4",
    fontSize: 11,
    fontWeight: "900",
  },
  statusTextActive: {
    color: "#86EFAC",
  },
  myRoomName: {
    color: "#EEF0F5",
    fontSize: 16,
    fontWeight: "900",
  },
  myRoomDescription: {
    color: "#AEB6C4",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailPill: {
    alignItems: "center",
    backgroundColor: "#303644",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  detailPillText: {
    color: "#AEB6C4",
    fontSize: 11,
    fontWeight: "800",
  },
  friendsBlock: {
    marginTop: 14,
  },
  friendsTitle: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    paddingHorizontal: 18,
    textTransform: "uppercase",
  },
  friendsContent: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  friendChip: {
    alignItems: "center",
    backgroundColor: "#222733",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: 190,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  friendChipPressed: {
    backgroundColor: "#262C39",
  },
  friendAvatar: {
    alignItems: "center",
    backgroundColor: "#303644",
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  friendAvatarText: {
    color: "#C7CCD6",
    fontSize: 10,
    fontWeight: "900",
  },
  friendChipTextWrap: {
    minWidth: 0,
  },
  friendName: {
    color: "#EEF0F5",
    fontSize: 12,
    fontWeight: "900",
  },
  friendRoom: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
    paddingTop: 18,
  },
  sectionLabel: {
    color: "#8F98A8",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionMeta: {
    color: "#737D8C",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
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
  emptyMessage: {
    color: "#8F98A8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  footerLoader: {
    marginVertical: 16,
  },
});
