import { createContext } from "react";
import type { useHLSPlayer } from "@/hooks/useHLSPlayer";

type PlayerState = ReturnType<typeof useHLSPlayer>;

export const PlayerContext = createContext<PlayerState | null>(null);
