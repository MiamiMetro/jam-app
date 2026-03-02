// StatusBar.tsx — Bottom bar showing current room info & controls when connected
import { useNavigate, useLocation } from "react-router-dom";
import { Hash, Users, LogOut, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useJam } from "@/hooks/useJams";
import { usePlayer } from "@/contexts/PlayerContext";

export default function StatusBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentJamRoomId = useUIStore((s) => s.currentJamRoomId);
  const setCurrentJamRoomId = useUIStore((s) => s.setCurrentJamRoomId);
  const { data: room } = useJam(currentJamRoomId || "");
  const player = usePlayer();

  const isOnRoomPage = location.pathname.startsWith("/jam/");

  // Hide when not in a room, or when already viewing the room (full controls there)
  if (!currentJamRoomId || !room || isOnRoomPage) return null;

  const handleLeave = () => {
    setCurrentJamRoomId(null);
  };

  const handleGoToRoom = () => {
    navigate(`/jam/${currentJamRoomId}`);
  };

  return (
    <div className="h-8 shrink-0 border-t border-border/40 surface-elevated flex items-center px-3 gap-3 text-xs select-none relative z-20">
      {/* Room info — clickable to navigate */}
      <button
        onClick={handleGoToRoom}
        className="flex items-center gap-2 min-w-0 cursor-pointer hover:text-foreground transition-colors group"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-pulse" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <Hash className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
        <span className="font-semibold truncate max-w-40 text-muted-foreground group-hover:text-foreground transition-colors">
          {room.name}
        </span>
      </button>

      {/* Separator */}
      <span className="w-px h-3.5 bg-border/50" />

      {/* Participant count */}
      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
        <Users className="h-3 w-3" />
        <span className="tabular-nums">{room.participants}/{room.maxParticipants}</span>
      </span>

      {/* Genre badge */}
      {room.genre && (
        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium shrink-0">
          {room.genre}
        </span>
      )}

      {/* Leave button */}
      <button
        onClick={handleLeave}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
      >
        <LogOut className="h-3 w-3" />
        <span className="font-medium">Leave</span>
      </button>

      {/* Audio controls */}
      {room.streamUrl && (
        <div className="flex items-center gap-2 shrink-0">
          {/* Play/Pause */}
          <button
            onClick={() => player.togglePlayPause()}
            disabled={player.isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            {player.isLoading ? (
              <div className="h-3.5 w-3.5 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin" />
            ) : player.isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Volume */}
          <button
            onClick={() => player.toggleMute()}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {player.volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={player.volume}
            onChange={(e) => player.setVolume(parseFloat(e.target.value))}
            className="w-14 h-1 accent-primary cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
