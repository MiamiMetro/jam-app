// PlayerContext.tsx — Shared HLS player instance for JamRoom + StatusBar
import { createContext, useContext } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useJam } from "@/hooks/useJams";
import { useHLSPlayer } from "@/hooks/useHLSPlayer";

type PlayerState = ReturnType<typeof useHLSPlayer>;

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const currentJamRoomId = useUIStore((s) => s.currentJamRoomId);
  const { data: room } = useJam(currentJamRoomId || "");
  const player = useHLSPlayer(room?.streamUrl);

  return (
    <PlayerContext.Provider value={player}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
