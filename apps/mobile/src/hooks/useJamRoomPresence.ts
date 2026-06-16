import React from "react";
import { useDisconnectPresence, useLeaveRoomPresence, useRoomHeartbeat } from "@/hooks/useRooms";
import type { Id } from "@jam-app/convex";

const HEARTBEAT_INTERVAL_MS = 20_000;

export function useJamRoomPresence(roomId: string | undefined, enabled: boolean) {
  const roomHeartbeat = useRoomHeartbeat();
  const disconnectPresence = useDisconnectPresence();
  const leaveRoomPresence = useLeaveRoomPresence();
  const sessionIdRef = React.useRef<string | null>(null);
  const sessionTokenRef = React.useRef<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  if (!sessionIdRef.current) {
    sessionIdRef.current = createRoomPresenceSessionId();
  }

  React.useEffect(() => {
    const leaveRoom = () => {
      const sessionId = sessionIdRef.current;
      const sessionToken = sessionTokenRef.current;
      if (roomId && sessionId) {
        leaveRoomPresence({
          roomId: roomId as Id<"rooms">,
          sessionId,
          sessionToken: sessionToken ?? undefined,
        }).catch(() => {});
      } else if (sessionToken) {
        disconnectPresence({ sessionToken }).catch(() => {});
      }
      sessionTokenRef.current = null;
      sessionIdRef.current = createRoomPresenceSessionId();
    };

    if (!roomId || !enabled) {
      leaveRoom();
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    const sendHeartbeat = async () => {
      try {
        const result = await roomHeartbeat({
          interval: HEARTBEAT_INTERVAL_MS,
          roomId: roomId as Id<"rooms">,
          sessionId: sessionIdRef.current!,
        });
        const sessionToken =
          typeof result === "string" ? result : result?.sessionToken;

        if (cancelled) return;

        if (sessionToken) {
          sessionTokenRef.current = sessionToken;
        }
        setError(null);
        setIsConnected(true);
      } catch (err) {
        if (cancelled) return;
        setIsConnected(false);
        setError(getPresenceError(err));
      }
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      leaveRoom();
    };
  }, [disconnectPresence, enabled, leaveRoomPresence, roomHeartbeat, roomId]);

  return { error, isConnected };
}

function createRoomPresenceSessionId() {
  return `mobile-room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPresenceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("ROOM_INACTIVE")) {
    return "This room is not active right now.";
  }
  if (message.includes("PRIVATE_ROOM")) {
    return "This room is private.";
  }
  if (message.includes("ROOM_NOT_FOUND")) {
    return "Room not found.";
  }

  return "Could not join this room as a listener.";
}
