import { StyleSheet, Text, View } from "react-native";
import type { RoomFeedItem } from "@/types";

type Props = {
  room: RoomFeedItem;
};

export default function JamItem({ room }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{room.name}</Text>
        <Text style={styles.status}>{room.status}</Text>
      </View>
      <Text style={styles.host}>@{room.host?.username ?? room.handle}</Text>
      {room.description ? <Text style={styles.description}>{room.description}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{room.genre ?? "Unknown genre"}</Text>
        <Text style={styles.metaText}>{room.participant_count} listeners</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: "#111827",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 12,
  },
  status: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  host: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
  description: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: "#6B7280",
    fontSize: 12,
  },
});
