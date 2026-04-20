import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, StyleSheet } from "react-native";
import JamList from "@/components/jams/JamList";
import { useFriendsInRooms, useMyRoom, useRooms } from "@/hooks/useRooms";
import { useMobileTheme } from "@/theme/MobileTheme";
import type { RoomFeedItem } from "@/types";

const JamScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const [search, setSearch] = React.useState("");
  const { rooms, isLoading, isLoadingMore, canLoadMore, loadMore } = useRooms(search);
  const { room: myRoom, isLoading: isMyRoomLoading } = useMyRoom();
  const { friendsInRooms } = useFriendsInRooms();
  const openRoom = React.useCallback(
    (room: Pick<RoomFeedItem, "handle">) => {
      navigation.navigate("JamRoom", { handle: room.handle });
    },
    [navigation]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <JamList
        friendsInRooms={friendsInRooms}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isMyRoomLoading={isMyRoomLoading}
        myRoom={myRoom}
        onEndReached={() => {
          if (canLoadMore && !isLoadingMore) {
            loadMore(10);
          }
        }}
        onOpenRoom={openRoom}
        onOpenRoomHandle={(handle) => navigation.navigate("JamRoom", { handle })}
        onSearchChange={setSearch}
        rooms={rooms}
        searchValue={search}
      />
    </SafeAreaView>
  );
};

export default JamScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
