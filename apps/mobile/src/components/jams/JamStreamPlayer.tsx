import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  roomName: string;
  streamUrl?: string | null;
};

const DEFAULT_VOLUME = 0.8;
const VOLUME_STEPS = [0.2, 0.4, 0.6, 0.8, 1];

export default function JamStreamPlayer({ roomName, streamUrl }: Props) {
  const { colors } = useMobileTheme();
  const player = useAudioPlayer(null, {
    keepAudioSessionActive: true,
    preferredForwardBufferDuration: 8,
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = React.useState<string | null>(null);
  const [hasLoadedSource, setHasLoadedSource] = React.useState(false);
  const [hasRequestedPlayback, setHasRequestedPlayback] = React.useState(false);
  const [volume, setVolumeState] = React.useState(DEFAULT_VOLUME);
  const previousVolumeRef = React.useRef(DEFAULT_VOLUME);

  const isPreparing =
    hasRequestedPlayback &&
    !status.playing &&
    (!status.isLoaded || status.isBuffering || status.timeControlStatus === "waiting");
  const statusLabel = error
    ? "Needs retry"
    : status.playing
      ? "LIVE"
      : isPreparing
        ? "Connecting"
        : hasLoadedSource || status.isLoaded
          ? "Ready"
          : "Offline";

  React.useEffect(() => {
    player.pause();
    try {
      player.remove();
    } catch {
      // The hook releases the player on unmount; remove is best-effort cleanup.
    }
    setError(null);
    setHasLoadedSource(false);
    setHasRequestedPlayback(false);
  }, [player, streamUrl]);

  React.useEffect(() => {
    if (!hasRequestedPlayback || status.playbackState !== "failed") return;
    setHasRequestedPlayback(false);
    setError("Stream could not be loaded.");
  }, [hasRequestedPlayback, status.playbackState]);

  const setVolume = React.useCallback(
    (nextVolume: number) => {
      const clamped = Math.max(0, Math.min(1, nextVolume));
      if (clamped > 0) {
        previousVolumeRef.current = clamped;
      }
      setVolumeState(clamped);
      player.volume = clamped;
      player.muted = clamped === 0;
    },
    [player]
  );

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
      return;
    }
    setVolume(previousVolumeRef.current || DEFAULT_VOLUME);
  };

  const startPlayback = async (forceReload = false) => {
    if (!streamUrl) return;

    try {
      setError(null);
      setHasRequestedPlayback(true);

      if (forceReload || !hasLoadedSource) {
        if (forceReload) {
          player.pause();
          try {
            player.remove();
          } catch {
            // See cleanup comment above.
          }
        }
        player.replace({
          name: `${roomName} live stream`,
          uri: streamUrl,
        });
        setHasLoadedSource(true);
      }

      player.volume = volume;
      player.muted = volume === 0;
      player.play();
    } catch {
      setHasRequestedPlayback(false);
      setError("Stream could not be played.");
    }
  };

  const togglePlayback = () => {
    if (!streamUrl) return;

    if (status.playing) {
      player.pause();
      setHasRequestedPlayback(false);
      return;
    }

    startPlayback();
  };

  if (!streamUrl) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.waitingVisualizer}>
          <View style={[styles.waitingBar, styles.waitingBarShort, { backgroundColor: colors.accentMuted }]} />
          <View style={[styles.waitingBar, { backgroundColor: colors.accentMuted }]} />
          <View style={[styles.waitingBar, styles.waitingBarTall, { backgroundColor: colors.accentMuted }]} />
          <View style={[styles.waitingBar, { backgroundColor: colors.accentMuted }]} />
          <View style={[styles.waitingBar, styles.waitingBarShort, { backgroundColor: colors.accentMuted }]} />
        </View>
        <Text style={[styles.waitingTitle, { color: colors.foreground }]}>Waiting for the jam to start</Text>
        <Text style={[styles.waitingBody, { color: colors.mutedForeground }]}>
          The stream will appear when the host starts performing.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel={status.playing ? "Pause jam stream" : "Play jam stream"}
          accessibilityRole="button"
          disabled={isPreparing}
          onPress={togglePlayback}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: colors.primary },
            pressed ? { opacity: 0.82 } : null,
            isPreparing ? styles.playButtonDisabled : null,
          ]}
        >
          {isPreparing ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Ionicons
              accessibilityElementsHidden
              color={colors.primaryForeground}
              importantForAccessibility="no-hide-descendants"
              name={status.playing ? "pause" : "play"}
              size={22}
            />
          )}
        </Pressable>

        <View style={styles.meta}>
          <View style={styles.titleLine}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
              Live Session
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.playing ? colors.destructiveMuted : colors.muted },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: status.playing ? colors.destructive : colors.mutedForeground },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: status.playing ? colors.destructive : colors.mutedForeground },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {status.playing ? "Listening at the live edge" : "Listener mode"}
          </Text>
        </View>
      </View>

      <View style={[styles.liveTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.liveFill,
            { backgroundColor: colors.accentMuted },
            status.playing ? styles.liveFillOn : null,
          ]}
        />
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          accessibilityLabel={volume > 0 ? "Mute stream" : "Unmute stream"}
          accessibilityRole="button"
          onPress={toggleMute}
          style={styles.iconButton}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.secondaryForeground}
            importantForAccessibility="no-hide-descendants"
            name={volume > 0 ? "volume-high-outline" : "volume-mute-outline"}
            size={18}
          />
        </Pressable>

        <View style={styles.volumeSteps}>
          {VOLUME_STEPS.map((step) => (
            <Pressable
              accessibilityLabel={`Set volume to ${Math.round(step * 100)} percent`}
              accessibilityRole="button"
              key={step}
              onPress={() => setVolume(step)}
              style={[
                styles.volumeStep,
                { backgroundColor: volume >= step ? colors.primary : colors.muted },
              ]}
            />
          ))}
        </View>

        {error ? (
          <Pressable
            accessibilityLabel="Retry stream"
            accessibilityRole="button"
            onPress={() => startPlayback(true)}
            style={[styles.retryButton, { borderColor: colors.ring }]}
          >
            <Ionicons
              accessibilityElementsHidden
              color={colors.primary}
              importantForAccessibility="no-hide-descendants"
              name="refresh"
              size={14}
            />
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 14,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  playButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  playButtonDisabled: {
    opacity: 0.72,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  liveTrack: {
    borderRadius: 8,
    height: 7,
    overflow: "hidden",
  },
  liveFill: {
    height: "100%",
    width: "0%",
  },
  liveFillOn: {
    width: "100%",
  },
  controlsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  volumeSteps: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 24,
  },
  volumeStep: {
    borderRadius: 3,
    flex: 1,
    height: 7,
  },
  retryButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "900",
  },
  error: {
    fontSize: 12,
    fontWeight: "700",
  },
  waitingVisualizer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 5,
    height: 34,
    justifyContent: "center",
  },
  waitingBar: {
    borderRadius: 3,
    height: 22,
    width: 6,
  },
  waitingBarShort: {
    height: 14,
  },
  waitingBarTall: {
    height: 30,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  waitingBody: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center",
  },
});
