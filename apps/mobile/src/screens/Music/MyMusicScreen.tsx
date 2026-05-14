import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AudioPostPlayer from "@/components/posts/AudioPostPlayer";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useAddTrack, useDeleteTrack, useMyTrackCount, useMyTracks } from "@/hooks/useMyTracks";
import { useMobileTheme } from "@/theme/MobileTheme";
import type { MyTrackItem } from "@/types";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

type SelectedAudio = {
  mimeType?: string;
  name: string;
  size?: number;
  uri: string;
};

export default function MyMusicScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const addTrack = useAddTrack();
  const deleteTrack = useDeleteTrack();
  const { isUploading, uploadFile } = useMediaUpload();
  const trackCount = useMyTrackCount();
  const {
    data: tracks,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMyTracks();
  const [selectedAudio, setSelectedAudio] = useState<SelectedAudio | null>(null);
  const [trackTitle, setTrackTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const defaultTitle = useMemo(
    () => (selectedAudio ? stripExtension(selectedAudio.name) : ""),
    [selectedAudio]
  );
  const isBusy = isSubmitting || isUploading;
  const canUpload = !!selectedAudio && !isBusy;

  const handlePickAudio = async () => {
    if (isBusy) return;

    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "audio/*",
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      if (typeof asset.size === "number" && asset.size > MAX_AUDIO_SIZE) {
        setError("Audio must be 25MB or smaller.");
        return;
      }
      if (!isSupportedAudioFile(asset.name, asset.mimeType)) {
        setError("iOS can play MP3, M4A, MP4, AAC, or WAV audio.");
        return;
      }

      setSelectedAudio({
        mimeType: asset.mimeType,
        name: asset.name || `audio-${Date.now()}`,
        size: asset.size,
        uri: asset.uri,
      });
      setTrackTitle(stripExtension(asset.name || ""));
    } catch (err) {
      setError(getMyMusicErrorMessage(err));
    }
  };

  const handleUpload = async () => {
    if (!selectedAudio || isBusy) return;

    try {
      setError(null);
      setIsSubmitting(true);
      const uploaded = await uploadFile({
        contentType: selectedAudio.mimeType,
        kind: "audio",
        name: selectedAudio.name,
        size: selectedAudio.size,
        uri: selectedAudio.uri,
      });

      await addTrack.mutateAsync({
        audioUrl: uploaded.url,
        contentType: uploaded.contentType || guessAudioContentType(selectedAudio.name),
        duration: 0,
        fileSize: uploaded.fileSize,
        title: trackTitle.trim() || defaultTitle || "Untitled track",
      });

      setSelectedAudio(null);
      setTrackTitle("");
    } catch (err) {
      setError(getMyMusicErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    if (deletingId) return;

    try {
      setError(null);
      setDeletingId(trackId);
      await deleteTrack.mutateAsync(trackId);
    } catch (err) {
      setError(getMyMusicErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
          tracks.length === 0 ? styles.emptyContent : null,
        ]}
        data={tracks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading your tracks...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.mutedForeground}
                  importantForAccessibility="no-hide-descendants"
                  name="musical-notes-outline"
                  size={32}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No uploads yet</Text>
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Pick an audio file and start your library.</Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Pressable
                accessibilityLabel="Back"
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
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
                <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>Library</Text>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Music</Text>
              </View>
            </View>

            <View
              style={[
                styles.uploadPanel,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={[styles.panelIcon, { backgroundColor: colors.accentMuted }]}>
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.primary}
                    importantForAccessibility="no-hide-descendants"
                    name="cloud-upload-outline"
                    size={20}
                  />
                </View>
                <View style={styles.panelText}>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>Upload music</Text>
                  <Text style={[styles.panelSubtitle, { color: colors.mutedForeground }]}>MP3, M4A, MP4, AAC, or WAV works best.</Text>
                </View>
              </View>

              <Pressable
                accessibilityLabel="Choose audio"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={handlePickAudio}
                style={({ pressed }) => [
                  styles.pickButton,
                  { backgroundColor: pressed && !isBusy ? colors.cardPressed : colors.input, borderColor: colors.borderStrong },
                  isBusy ? styles.buttonDisabled : null,
                ]}
              >
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.primary}
                  importantForAccessibility="no-hide-descendants"
                  name="folder-open-outline"
                  size={18}
                />
                <Text style={[styles.pickButtonText, { color: colors.secondaryForeground }]}>
                  {selectedAudio ? selectedAudio.name : "Choose audio"}
                </Text>
              </Pressable>

              {selectedAudio ? (
                <View
                  style={[
                    styles.selectedBox,
                    { backgroundColor: colors.input, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.selectedMeta}>
                    <Text numberOfLines={1} style={[styles.selectedName, { color: colors.secondaryForeground }]}>
                      {selectedAudio.name}
                    </Text>
                    <Text style={[styles.selectedSize, { color: colors.mutedForeground }]}>{formatFileSize(selectedAudio.size)}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Remove selected audio"
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => {
                      setSelectedAudio(null);
                      setTrackTitle("");
                    }}
                    style={styles.removeButton}
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
              ) : null}

              <TextInput
                editable={!isBusy}
                onChangeText={(value) => {
                  setTrackTitle(value);
                  setError(null);
                }}
                placeholder="Track title"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.borderStrong,
                    color: colors.foreground,
                  },
                ]}
                value={trackTitle}
              />

              {error ? (
                <Text
                  style={[
                    styles.error,
                    {
                      backgroundColor: colors.destructiveMuted,
                      borderColor: colors.destructive,
                      color: colors.destructive,
                    },
                  ]}
                >
                  {error}
                </Text>
              ) : null}

              <Pressable
                accessibilityLabel="Upload to My Music"
                accessibilityRole="button"
                disabled={!canUpload}
                onPress={handleUpload}
                style={({ pressed }) => [
                  styles.uploadButton,
                  {
                    backgroundColor: canUpload ? colors.primary : colors.muted,
                  },
                  pressed && canUpload ? styles.uploadButtonPressed : null,
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.uploadButtonText, { color: colors.primaryForeground }]}>Upload to My Music</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Uploads</Text>
              <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>{trackCount} tracks</Text>
            </View>
          </>
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <TrackRow
            deleting={deletingId === item.id}
            onDelete={() => handleDelete(item.id)}
            track={item}
          />
        )}
      />
    </SafeAreaView>
  );
}

function TrackRow({
  deleting,
  onDelete,
  track,
}: {
  deleting: boolean;
  onDelete: () => void;
  track: MyTrackItem;
}) {
  const { colors } = useMobileTheme();

  return (
    <View style={[styles.trackRow, { borderBottomColor: colors.border }]}>
      <View style={styles.trackHeader}>
        <View style={styles.trackTitleWrap}>
          <Text numberOfLines={1} style={[styles.trackTitle, { color: colors.foreground }]}>
            {track.title}
          </Text>
          <Text style={[styles.trackMeta, { color: colors.mutedForeground }]}>
            {formatFileSize(track.file_size)} - {formatDate(track.created_at)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Delete ${track.title}`}
          accessibilityRole="button"
          disabled={deleting}
          onPress={onDelete}
          style={styles.deleteButton}
        >
          {deleting ? (
            <ActivityIndicator color={colors.mutedForeground} size="small" />
          ) : (
            <Ionicons
              accessibilityElementsHidden
              color={colors.mutedForeground}
              importantForAccessibility="no-hide-descendants"
              name="trash-outline"
              size={18}
            />
          )}
        </Pressable>
      </View>

      {track.audio_url ? (
        <AudioPostPlayer
          audioUrl={track.audio_url}
          duration={track.duration}
          style={[styles.trackPlayer, { backgroundColor: colors.card }]}
          title={track.title}
        />
      ) : (
        <Text
          style={[
            styles.error,
            {
              backgroundColor: colors.destructiveMuted,
              borderColor: colors.destructive,
              color: colors.destructive,
            },
          ]}
        >
          Audio URL is not available for this track.
        </Text>
      )}
    </View>
  );
}

function getMyMusicErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("NOT_AUTHENTICATED")) {
    return "Please sign in again.";
  }
  if (message.includes("TITLE_REQUIRED")) {
    return "Track title is required.";
  }
  if (message.includes("TRACK_LIMIT_REACHED")) {
    return "You can have at most 30 tracks.";
  }
  if (message.includes("INVALID_FILE_TYPE")) {
    return "Please choose an audio file.";
  }
  if (message.includes("FILE_TOO_LARGE")) {
    return "Audio must be 25MB or smaller.";
  }
  if (message.includes("Rate limit")) {
    return "Slow down for a moment before uploading again.";
  }
  if (message.includes("UPLOAD")) {
    return message.replace(/^[A-Z_]+:\s*/, "") || "Audio upload failed.";
  }

  return message || "Something went wrong. Please try again.";
}

function stripExtension(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

function formatFileSize(size: number | undefined) {
  if (!size) return "Audio file";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function guessAudioContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

function isSupportedAudioFile(filename: string, mimeType?: string) {
  if (Platform.OS !== "ios") return true;

  const lowerName = filename.toLowerCase();
  const lowerType = mimeType?.toLowerCase() ?? "";
  if (lowerName.endsWith(".webm") || lowerName.endsWith(".ogg")) return false;
  if (lowerType.includes("webm") || lowerType.includes("ogg")) return false;
  return true;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 22,
  },
  emptyContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  uploadPanel: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  panelIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  panelText: {
    flex: 1,
    minWidth: 0,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  panelSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 3,
  },
  pickButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  pickButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  selectedBox: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  selectedMeta: {
    flex: 1,
    minWidth: 0,
  },
  selectedName: {
    fontSize: 13,
    fontWeight: "800",
  },
  selectedSize: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  removeButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  error: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  uploadButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    marginTop: 12,
  },
  uploadButtonPressed: {
    opacity: 0.82,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
    paddingTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  trackRow: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  trackHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  trackTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  trackMeta: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  deleteButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  trackPlayer: {},
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  stateText: {
    marginTop: 10,
    textAlign: "center",
  },
  footerLoader: {
    marginVertical: 16,
  },
});
