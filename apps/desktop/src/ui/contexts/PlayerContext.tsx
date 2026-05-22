// PlayerContext.tsx — Shared HLS player instance for JamRoom + StatusBar
import { useUIStore } from "@/stores/uiStore";
import { useRoom } from "@/hooks/useRooms";
import { useHLSPlayer } from "@/hooks/useHLSPlayer";
import { PlayerContext } from "./playerContextCore";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const currentJamRoomHandle = useUIStore((s) => s.currentJamRoomHandle);
  const { data: room } = useRoom(currentJamRoomHandle || undefined);
  const player = useHLSPlayer(room?.stream_url ?? undefined);

  return (
    <PlayerContext.Provider value={player}>
      {children}
    </PlayerContext.Provider>
  );
}
