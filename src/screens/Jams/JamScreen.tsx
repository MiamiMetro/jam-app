import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import JamList from "@/components/jams/JamList";
import { useRooms } from "@/hooks/useRooms";

const JamScreen = () => {
  const { rooms, isLoading, isLoadingMore, canLoadMore, loadMore } = useRooms();

  return (
    <SafeAreaView style={styles.container}>
      <JamList
        rooms={rooms}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onEndReached={() => {
          if (canLoadMore && !isLoadingMore) {
            loadMore(10);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default JamScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
