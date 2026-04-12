import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import type { RoomFeedItem } from "@/types";
import JamItem from "./JamItem";

type Props = {
  rooms: RoomFeedItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onEndReached?: () => void;
};

export default function JamList({
  rooms,
  isLoading = false,
  isLoadingMore = false,
  onEndReached,
}: Props) {
  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Active jams are loading...</Text>
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateText}>No active jams right now.</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={rooms}
      keyExtractor={(item) => item.id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => <JamItem room={item} />}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  content: {
    paddingVertical: 12,
  },
  footerLoader: {
    marginVertical: 16,
  },
});
