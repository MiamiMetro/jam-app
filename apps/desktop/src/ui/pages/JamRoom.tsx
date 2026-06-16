// JamRoom.tsx — Live jam room with performer/listener split, chat, audio stream
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef, memo, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Music,
  Users,
  Send,
  Hash,
  Play,
  Pause,
  LogOut,
  Settings,
  RefreshCw,
  AlertTriangle,
  Check,
  Flag,
  Lock,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  useRoom,
  useRoomParticipants,
  useRoomModeration,
  useRoomMessages,
  useSendRoomMessage,
  useRoomHeartbeat,
  useGuestRoomHeartbeat,
  useDisconnectPresence,
  useCreatePerformerJoinToken,
  useRefreshJamSession,
  useStartListenerMode,
  useStopListenerMode,
  useRefreshListenerMode,
  useUpdateRoom,
  useRequestRoomAccess,
  useDecideRoomAccessRequest,
  useRevokeRoomAccessGrant,
} from "@/hooks/useRooms";
import type { Id } from "@jam-app/convex";
import type { JamBroadcastState, JamClientState } from "../electron";
import { usePlayer } from "@/contexts/usePlayer";
import { usePostAudio } from "@/contexts/PostAudioContext";
import { Timestamp } from "@/components/Timestamp";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { RoomFormDialog, type RoomFormData } from "@/components/RoomFormDialog";
import { censorText } from "@/lib/bannedWords";
import { useReportContent } from "@/hooks/usePosts";
import { useJoinCommunity } from "@/hooks/useCommunities";

interface JamRoomProps {
  roomHandle?: string;
}

const BROADCAST_IPC_PORT = 39000;

function nativeJamErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (message.includes("JAM_SERVER_NOT_CONFIGURED")) {
    return "Jam server is not configured.";
  }
  if (message.includes("JAM_SERVER_SECRET_MISSING")) {
    return "Jam server secret is missing.";
  }
  if (message.includes("COMMUNITY_JAM_SERVER_NOT_CONFIGURED")) {
    return "Community jam server is not configured.";
  }
  if (message.includes("COMMUNITY_JAM_SERVER_SECRET_MISSING")) {
    return "Community jam server secret is missing.";
  }
  if (message.includes("COMMUNITY_MEMBERSHIP_REQUIRED")) {
    return "Join this community before jamming.";
  }
  if (message.includes("ROOM_INACTIVE")) {
    return "This room is not active.";
  }
  if (message.includes("PRIVATE_ROOM")) {
    return "This room is private.";
  }
  return message || "Failed to launch client";
}

function JamRoom({ roomHandle }: JamRoomProps = {}) {
  const paramsHandle = useParams<{ handle: string }>()?.handle;
  const handleToUse = roomHandle ?? paramsHandle;
  const navigate = useNavigate();
  const { user, isGuest } = useAuthStore();
  const { data: room, isLoading } = useRoom(handleToUse || undefined);
  const { data: participants } = useRoomParticipants(room?.id);
  const { data: moderation } = useRoomModeration(room?.id, Boolean(room && !isGuest && user && room.host_id === user.id));
  const { data: messages } = useRoomMessages(room?.id);
  const sendRoomMessage = useSendRoomMessage();
  const roomHeartbeat = useRoomHeartbeat();
  const guestRoomHeartbeat = useGuestRoomHeartbeat();
  const disconnectPresence = useDisconnectPresence();
  const createPerformerJoinToken = useCreatePerformerJoinToken();
  const refreshJamSession = useRefreshJamSession();
  const startListenerMode = useStartListenerMode();
  const stopListenerMode = useStopListenerMode();
  const refreshListenerMode = useRefreshListenerMode();
  const updateRoom = useUpdateRoom();
  const requestRoomAccess = useRequestRoomAccess();
  const decideAccessRequest = useDecideRoomAccessRequest();
  const revokeAccessGrant = useRevokeRoomAccessGrant();
  const joinCommunity = useJoinCommunity();
  const reportContent = useReportContent();
  const censorshipEnabled = useUIStore((s) => s.censorshipEnabled);
  const currentJamRoomHandle = useUIStore((s) => s.currentJamRoomHandle);
  const setCurrentJamRoomHandle = useUIStore(
    (s) => s.setCurrentJamRoomHandle
  );
  const [message, setMessage] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [isPerforming, setIsPerforming] = useState(false);
  const [clientState, setClientState] = useState<JamClientState>("idle");
  const [broadcastState, setBroadcastState] = useState<JamBroadcastState>("idle");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [showCommunityJoinActions, setShowCommunityJoinActions] = useState(false);
  const [roomPanel, setRoomPanel] = useState<"listeners" | "requests" | "approved">("listeners");
  const [requestingAccess, setRequestingAccess] = useState<"listen" | "jam" | null>(null);
  const [publishSessionId, setPublishSessionId] = useState<Id<"listener_publish_sessions"> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const jamSessionIdRef = useRef<Id<"jam_sessions"> | null>(null);
  const listenerCleanupRef = useRef<{
    isHost: boolean;
    roomId: Id<"rooms"> | null;
    publishSessionId: Id<"listener_publish_sessions"> | null;
    stopListenerMode: typeof stopListenerMode;
  } | null>(null);

  // HLS stream player (shared via context so StatusBar can control it too)
  const hlsPlayer = usePlayer();
  const postAudio = usePostAudio();

  useEffect(() => {
    if (hlsPlayer.isPlaying && postAudio.isPlaying) {
      postAudio.pause();
    }
  }, [hlsPlayer.isPlaying, postAudio]);

  // Presence heartbeat — only beats while user is actively in this room
  const isInRoom = currentJamRoomHandle === handleToUse;
  const roomPresenceRole = isPerforming ? "performer" : "listener";
  const sessionId = useId();
  const sessionTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!room?.id || !isInRoom) {
      // Not in room — disconnect if we have a token
      if (sessionTokenRef.current) {
        disconnectPresence({ sessionToken: sessionTokenRef.current }).catch(
          () => {}
        );
        sessionTokenRef.current = null;
      }
      return;
    }
    const HEARTBEAT_INTERVAL = 20_000;
    const doHeartbeat = () => {
      const heartbeatFn = isGuest
        ? guestRoomHeartbeat({
            roomId: room.id as Id<"rooms">,
            sessionId,
            interval: HEARTBEAT_INTERVAL,
          })
        : roomHeartbeat({
            roomId: room.id as Id<"rooms">,
            sessionId,
            interval: HEARTBEAT_INTERVAL,
            role: roomPresenceRole,
          });
      return heartbeatFn
        .then((result) => {
          const token =
            typeof result === "string" ? result : result?.sessionToken;
          if (token) sessionTokenRef.current = token;
        })
        .catch((err) => {
          const msg = err?.message || err?.data || "";
          if (
            msg.includes("ROOM_NOT_FOUND") ||
            msg.includes("ROOM_INACTIVE") ||
            msg.includes("PRIVATE_ROOM")
          ) {
            // Room gone or access revoked — auto-leave
            setCurrentJamRoomHandle(null);
          }
        });
    };
    doHeartbeat();
    const timer = setInterval(doHeartbeat, HEARTBEAT_INTERVAL);
    return () => {
      clearInterval(timer);
      if (sessionTokenRef.current) {
        disconnectPresence({ sessionToken: sessionTokenRef.current }).catch(
          () => {}
        );
        sessionTokenRef.current = null;
      }
    };
  }, [room?.id, isGuest, isInRoom, roomPresenceRole, roomHeartbeat, guestRoomHeartbeat, disconnectPresence, sessionId, setCurrentJamRoomHandle]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setShowCommunityJoinActions(false);
  }, [room?.id]);

  const performers = useMemo(
    () => participants.filter((p) => (p.role as string) === "performer"),
    [participants]
  );
  const listeners = useMemo(
    () => participants.filter((p) => (p.role as string) === "listener"),
    [participants]
  );
  const isHost = !isGuest && user && room && room.host_id === user.id;
  const communityName = room?.community?.name ?? "Community";
  const communityHandle = room?.community?.handle ?? null;

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim() || isGuest || !room?.id) return;

      try {
        await sendRoomMessage({
          roomId: room.id as Id<"rooms">,
          text: message.trim(),
        });
        setMessage("");
      } catch {
        // silently ignore send errors
      }
    },
    [message, isGuest, room, sendRoomMessage]
  );

  const handleLeaveRoom = useCallback(() => {
    if (isHost) {
      window.electron?.stopJamBroadcast?.().catch(() => {});
      if (room?.id) {
        const args = publishSessionId
          ? { roomId: room.id as Id<"rooms">, publishSessionId }
          : { roomId: room.id as Id<"rooms"> };
        stopListenerMode(args).catch(() => {});
      }
    }
    if (sessionTokenRef.current) {
      disconnectPresence({ sessionToken: sessionTokenRef.current }).catch(
        () => {}
      );
      sessionTokenRef.current = null;
    }
    setCurrentJamRoomHandle(null);
    navigate("/jams");
  }, [isHost, room, publishSessionId, navigate, setCurrentJamRoomHandle, disconnectPresence, stopListenerMode]);

  const handleReportRoom = useCallback(async () => {
    if (!room?.id) return;
    if (!window.confirm("Report this room to Jam for review?")) return;
    await reportContent.mutateAsync({
      targetType: "room",
      targetId: room.id,
      reason: "other",
    });
    setReportSubmitted(true);
    window.setTimeout(() => setReportSubmitted(false), 1000);
  }, [reportContent, room]);

  const handleUpdateRoomSettings = useCallback(async (data: RoomFormData) => {
    if (!room?.id || !data.name.trim()) return;

    try {
      await updateRoom({
        roomId: room.id as Id<"rooms">,
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxPerformers: data.maxPerformers,
        isPrivate: data.isPrivate,
        visibility: data.visibility,
        listenAccess: data.listenAccess,
        jamAccess: data.jamAccess,
      });
      setIsRoomSettingsOpen(false);
    } catch (error) {
      console.error("Failed to update room:", error);
    }
  }, [room, updateRoom]);

  const handleRequestAccess = useCallback(async (type: "listen" | "jam") => {
    if (!room?.id) return;
    setRequestingAccess(type);
    try {
      await requestRoomAccess({ roomId: room.id as Id<"rooms">, type });
    } finally {
      setRequestingAccess(null);
    }
  }, [requestRoomAccess, room]);

  const handleDecideAccessRequest = useCallback(async (
    requestId: Id<"room_access_requests">,
    decision: "approved" | "rejected"
  ) => {
    await decideAccessRequest({ requestId, decision });
  }, [decideAccessRequest]);

  const handleRevokeAccessGrant = useCallback(async (grantId: Id<"room_access_grants">) => {
    await revokeAccessGrant({ grantId });
  }, [revokeAccessGrant]);

  const handleJoinCommunity = useCallback(async () => {
    if (!room?.community_id) return;
    try {
      await joinCommunity.mutateAsync(room.community_id);
      setShowCommunityJoinActions(false);
      setClientError(null);
    } catch (error) {
      setClientError(error instanceof Error ? error.message : "Failed to join community");
    }
  }, [joinCommunity, room?.community_id]);

  const handleJoinClient = useCallback(async () => {
    if (!room?.viewer_access?.can_jam) {
      setShowCommunityJoinActions(false);
      setClientError("Ask the host for permission to jam.");
      return;
    }
    try {
      setShowCommunityJoinActions(false);
      setClientError(null);
      if (!window.electron) {
        setClientError("Electron API not available");
        return;
      }
      if (!room?.id) {
        setClientError("Room is not ready");
        return;
      }
      setClientState("launching");
      const launchContext = await createPerformerJoinToken({
        roomId: room.id as Id<"rooms">,
      });
      jamSessionIdRef.current = launchContext.sessionId;
      const result = await window.electron.launchJamClient({
        serverHost: launchContext.serverHost,
        serverPort: launchContext.serverPort,
        roomId: launchContext.roomId,
        roomHandle: launchContext.roomHandle,
        profileId: launchContext.profileId,
        displayName: launchContext.displayName,
        joinToken: launchContext.joinToken,
        codec: launchContext.codec,
        frames: launchContext.frames,
        broadcastIpcPort: isHost ? BROADCAST_IPC_PORT : undefined,
      });
      if (result.success) {
        setIsPerforming(true);
        setClientState(result.state ?? "running");
      } else {
        setClientState(result.state ?? "failed");
        setClientError(result.error || "Failed to launch client");
      }
    } catch (error) {
      setClientState("failed");
      const message = nativeJamErrorMessage(error);
      setClientError(message);
      setShowCommunityJoinActions(
        message === "Join this community before jamming." &&
          Boolean(room?.community_id) &&
          !isGuest
      );
    }
  }, [room, isHost, createPerformerJoinToken, isGuest]);

  const handleStartBroadcast = useCallback(async () => {
    try {
      setBroadcastError(null);
      if (!window.electron) {
        setBroadcastError("Electron API not available");
        return;
      }
      if (!room?.id) {
        setBroadcastError("Room is not ready");
        return;
      }
      if (clientState !== "running" && clientState !== "launching") {
        setBroadcastError("Start jamming before enabling listener mode");
        return;
      }

      setBroadcastState("launching");
      const launchContext = await startListenerMode({
        roomId: room.id as Id<"rooms">,
      });
      setPublishSessionId(launchContext.publishSessionId);

      const result = await window.electron.launchJamBroadcast({
        roomId: String(room.id),
        ipcPort: launchContext.ipcPort,
        srtUrl: launchContext.srtUrl,
        hlsUrl: launchContext.hlsUrl,
      });
      setBroadcastState(result.state);

      if (!result.success) {
        await stopListenerMode({
          roomId: room.id as Id<"rooms">,
          publishSessionId: launchContext.publishSessionId,
        }).catch(() => {});
        setPublishSessionId(null);
        setBroadcastError(result.error || "Failed to start listener mode");
        return;
      }
    } catch (error) {
      setBroadcastState("failed");
      setBroadcastError(
        error instanceof Error ? error.message : "Failed to start listener mode"
      );
    }
  }, [clientState, room, startListenerMode, stopListenerMode]);

  const handleStopBroadcast = useCallback(async () => {
    try {
      setBroadcastError(null);
      setBroadcastState("stopping");
      const result = await window.electron?.stopJamBroadcast?.();
      setBroadcastState(result?.state ?? "idle");
      if (room?.id) {
        const args = publishSessionId
          ? { roomId: room.id as Id<"rooms">, publishSessionId }
          : { roomId: room.id as Id<"rooms"> };
        await stopListenerMode(args);
      }
      setPublishSessionId(null);
      if (!result?.success) {
        setBroadcastError(result?.error || "Failed to stop listener mode");
        return;
      }
    } catch (error) {
      setBroadcastState("failed");
      setBroadcastError(
        error instanceof Error ? error.message : "Failed to stop listener mode"
      );
    }
  }, [room, publishSessionId, stopListenerMode]);

  useEffect(() => {
    if (
      !isHost ||
      (broadcastState !== "running" && broadcastState !== "launching") ||
      (clientState !== "idle" && clientState !== "failed" && clientState !== "exited")
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      handleStopBroadcast().catch(() => {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isHost, broadcastState, clientState, handleStopBroadcast]);

  useEffect(() => {
    if (!window.electron || (clientState !== "launching" && clientState !== "running")) {
      return;
    }

    const poll = async () => {
      const status = await window.electron?.getJamClientStatus();
      if (!status) return;
      setClientState(status.state);
      setIsPerforming(status.state === "running" || status.state === "launching");
      if (status.state === "failed") {
        setClientError(status.error || "Native jam client failed");
      }
      if (status.state === "exited") {
        jamSessionIdRef.current = null;
        if (status.error) {
          setClientError(status.error);
        }
      }
    };

    const timer = window.setInterval(() => {
      poll().catch(() => {});
    }, 2_000);
    poll().catch(() => {});
    return () => window.clearInterval(timer);
  }, [clientState]);

  useEffect(() => {
    if (
      !window.electron ||
      (broadcastState !== "launching" &&
        broadcastState !== "running" &&
        broadcastState !== "stopping")
    ) {
      return;
    }

    const poll = async () => {
      const status = await window.electron?.getJamBroadcastStatus();
      if (!status) return;
      setBroadcastState(status.state);
      if (status.state === "failed" || status.state === "exited") {
        setBroadcastError(status.error || "Native broadcaster failed");
      }
    };

    const timer = window.setInterval(() => {
      poll().catch(() => {});
    }, 2_000);
    poll().catch(() => {});
    return () => window.clearInterval(timer);
  }, [broadcastState]);

  useEffect(() => {
    listenerCleanupRef.current = {
      isHost: Boolean(isHost),
      roomId: room?.id ? (room.id as Id<"rooms">) : null,
      publishSessionId,
      stopListenerMode,
    };
  }, [isHost, room?.id, publishSessionId, stopListenerMode]);

  useEffect(() => {
    return () => {
      const cleanup = listenerCleanupRef.current;
      if (!cleanup?.isHost || !cleanup.roomId) return;

      window.electron?.stopJamBroadcast?.().catch(() => {});
      const args = cleanup.publishSessionId
        ? { roomId: cleanup.roomId, publishSessionId: cleanup.publishSessionId }
        : { roomId: cleanup.roomId };
      cleanup.stopListenerMode(args).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (broadcastState !== "running" || !publishSessionId) return;

    const refresh = () => {
      refreshListenerMode({ publishSessionId })
        .then((result) => {
          if (!result.refreshed) {
            setBroadcastState("failed");
            setBroadcastError("Listener mode session expired");
            window.electron?.stopJamBroadcast?.().catch(() => {});
          }
        })
        .catch((error) => {
          setBroadcastError(
            error instanceof Error ? error.message : "Failed to refresh listener mode"
          );
        });
    };

    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [broadcastState, publishSessionId, refreshListenerMode]);

  useEffect(() => {
    if (clientState !== "running" || !jamSessionIdRef.current) return;

    const refresh = () => {
      const sessionId = jamSessionIdRef.current;
      if (!sessionId) return;
      refreshJamSession({ sessionId }).catch((error) => {
        setClientError(nativeJamErrorMessage(error));
      });
    };

    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [clientState, refreshJamSession]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading room..." />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Music}
          title="Room not found"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/jams")}
            >
              Back to Jams
            </Button>
          }
        />
      </div>
    );
  }

  const editInitialData: RoomFormData = {
    handle: room.handle,
    name: room.name,
    description: room.description || "",
    genre: room.genre || "",
    maxPerformers: room.max_performers,
    isPrivate: room.is_private,
    visibility: room.visibility,
    listenAccess: room.listen_access,
    jamAccess: room.jam_access,
  };

  return (
    <div className="flex h-full min-h-0 bg-background">
      <RoomFormDialog
        open={isRoomSettingsOpen}
        onOpenChange={setIsRoomSettingsOpen}
        onSubmit={handleUpdateRoomSettings}
        mode="edit"
        initialData={editInitialData}
      />
      {/* Main Room Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Room Header */}
        <div className="page-header caption-safe border-b border-border px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="no-drag cursor-pointer shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-primary/60" />
                <h1 className="text-sm font-heading font-bold truncate">
                  {room.name}
                </h1>
                {isHost && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    Host
                  </span>
                )}
                {isPerforming && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold animate-glow-pulse">
                    PERFORMING
                  </span>
                )}
                {room.stream_url && hlsPlayer.isPlaying && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {room.genre && (
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                    {room.genre}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.participant_count}
                </span>
                <span className="text-border">&middot;</span>
                <span>Host: {room.host?.display_name || room.host?.username || "Unknown"}</span>
                {room.community && (
                  <>
                    <span className="text-border">&middot;</span>
                    <button
                      type="button"
                      disabled={!communityHandle}
                      onClick={() => communityHandle && navigate(`/community/${communityHandle}`)}
                      className="no-drag truncate rounded text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
                    >
                      Community: {communityName}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={clientError ? "destructive" : "default"}
                size="sm"
                onClick={handleJoinClient}
                disabled={
                  clientState === "launching" ||
                  clientState === "running" ||
                  !room.viewer_access?.can_jam
                }
                className={`${!clientError ? "glow-primary" : ""}`}
              >
                <Music className="h-3.5 w-3.5 mr-1.5" />
                {!room.viewer_access?.can_jam
                  ? "Jam Locked"
                  : clientState === "launching"
                  ? "Launching..."
                  : clientState === "running"
                    ? "Jamming"
                    : "Start Jamming"}
              </Button>
              {isHost && (
                <Button
                  variant={broadcastState === "running" ? "outline" : "default"}
                  size="sm"
                  className={broadcastState === "running" ? "glass-solid border-border/50" : ""}
                  onClick={broadcastState === "running" ? handleStopBroadcast : handleStartBroadcast}
                  disabled={
                    broadcastState === "launching" ||
                    broadcastState === "stopping" ||
                    (broadcastState !== "running" &&
                      clientState !== "running" &&
                      clientState !== "launching")
                  }
                >
                  <Radio className="h-3.5 w-3.5 mr-1.5" />
                  {broadcastState === "launching"
                    ? "Starting..."
                    : broadcastState === "stopping"
                      ? "Stopping..."
                      : broadcastState === "running"
                        ? "Stop Listener"
                        : "Start Listener"}
                </Button>
              )}
              {isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-solid border-border/50"
                  onClick={() => setIsRoomSettingsOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </Button>
              )}
              {!isGuest && !isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-solid border-border/50 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                  onClick={handleReportRoom}
                >
                  {reportSubmitted ? (
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                  ) : (
                    <Flag className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {reportSubmitted ? "Reported" : "Report"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="glass-solid border-border/50 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                onClick={handleLeaveRoom}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Leave
              </Button>
            </div>
          </div>
          {clientError && (
            <div className="glass-solid rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-destructive mt-2">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{clientError}</span>
              {showCommunityJoinActions && room.community_id && (
                <>
                  {communityHandle && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => navigate(`/community/${communityHandle}`)}
                    >
                      View
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={joinCommunity.isPending}
                    onClick={handleJoinCommunity}
                  >
                    {joinCommunity.isPending ? "Joining..." : "Join"}
                  </Button>
                </>
              )}
            </div>
          )}
          {(broadcastError || broadcastState === "running") && (
            <div className={`glass-solid rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs mt-2 ${broadcastError ? "text-destructive" : "text-green-400"}`}>
              {broadcastError ? (
                <AlertTriangle className="h-3 w-3 shrink-0" />
              ) : (
                <Radio className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {broadcastError || "Listener mode live"}
              </span>
            </div>
          )}
          {!isHost && !isGuest && room.viewer_access && (!room.viewer_access.can_listen || !room.viewer_access.can_jam) && (
            <div className="glass-solid rounded-lg px-3 py-2 flex items-center gap-2 text-xs mt-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground flex-1">
                {!room.viewer_access.can_listen
                  ? "Listening requires host approval."
                  : "Jamming requires host approval."}
              </span>
              {!room.viewer_access.can_listen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={room.viewer_access.listen_request_status === "pending" || requestingAccess === "listen"}
                  onClick={() => handleRequestAccess("listen")}
                >
                  {room.viewer_access.listen_request_status === "pending" ? "Requested" : "Request Access"}
                </Button>
              )}
              {room.viewer_access.can_listen && !room.viewer_access.can_jam && room.jam_access === "approved" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={room.viewer_access.jam_request_status === "pending" || requestingAccess === "jam"}
                  onClick={() => handleRequestAccess("jam")}
                >
                  {room.viewer_access.jam_request_status === "pending" ? "Requested" : "Request to Jam"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Audio Stream */}
            <div className="mb-4 shrink-0">
              <div className="p-4 glass-strong rounded-lg">
                {room.stream_url ? (
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-full glass-solid hover:bg-foreground/6 shrink-0"
                      onClick={() => {
                        if (!hlsPlayer.isPlaying && postAudio.isPlaying) {
                          postAudio.pause();
                        }
                        hlsPlayer.togglePlayPause();
                      }}
                      disabled={hlsPlayer.isLoading}
                    >
                      {hlsPlayer.isLoading ? (
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : hlsPlayer.isPlaying ? (
                        <Pause className="h-7 w-7" />
                      ) : (
                        <Play className="h-7 w-7" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-heading font-semibold">
                          Live Session
                        </span>
                        {hlsPlayer.isPlaying && (
                          <span className="flex items-end gap-0.5 h-4 text-primary">
                            <span className="eq-bar eq-bar-1" />
                            <span className="eq-bar eq-bar-2" />
                            <span className="eq-bar eq-bar-3" />
                            <span className="eq-bar eq-bar-4" />
                          </span>
                        )}
                      </div>
                      {hlsPlayer.error ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-500 flex-1">
                            {hlsPlayer.error}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              hlsPlayer.retry();
                              setTimeout(() => hlsPlayer.play(), 200);
                            }}
                            className="h-7 text-xs glass-solid border-border/50"
                            disabled={hlsPlayer.isLoading}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 group/progress">
                            <div className="flex-1 h-1.5 group-hover/progress:h-2.5 bg-foreground/8 rounded-full overflow-hidden transition-all duration-200">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: hlsPlayer.isPlaying ? "100%" : "0%",
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                              {hlsPlayer.isPlaying && (
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                              )}
                              {hlsPlayer.isPlaying
                                ? "LIVE"
                                : hlsPlayer.isReady
                                  ? "PAUSED"
                                  : "OFFLINE"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => hlsPlayer.toggleMute()}
                              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              {hlsPlayer.volume === 0 ? (
                                <VolumeX className="h-3.5 w-3.5" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={hlsPlayer.volume}
                              onChange={(e) =>
                                hlsPlayer.setVolume(parseFloat(e.target.value))
                              }
                              className="w-16 h-1 accent-primary cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <div className="flex items-end justify-center gap-1 h-8 mb-3 text-primary/15">
                      <span className="w-1 h-3 rounded-full bg-current" />
                      <span className="w-1 h-5 rounded-full bg-current" />
                      <span className="w-1 h-7 rounded-full bg-current" />
                      <span className="w-1 h-4 rounded-full bg-current" />
                      <span className="w-1 h-6 rounded-full bg-current" />
                      <span className="w-1 h-3 rounded-full bg-current" />
                    </div>
                    <p className="text-sm font-medium">
                      Waiting for the jam to start
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground/60">
                      Stream will begin when the host starts performing
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Performers Section */}
            {performers.length > 0 && (
              <div className="mb-4 shrink-0">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-green-500" />
                  Performers ({performers.length})
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {performers.map((p) => (
                    <div
                      key={p.profile_id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 hover:border-primary/25 transition-all cursor-pointer"
                      onClick={() =>
                        !p.is_guest && p.profile?.username && navigate(`/profile/${p.profile.username}`)
                      }
                    >
                      <div className="relative">
                        <Avatar
                          size="default"
                          className="h-12 w-12 ring-2 ring-primary/30"
                        >
                          <AvatarImage src={p.profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {(p.profile?.username || "??")
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-background" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          {p.profile?.display_name || p.profile?.username || "Unknown"}
                          {room.host_id === p.profile_id && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">
                              Host
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex items-end gap-0.5 h-4 text-primary/40 ml-2">
                        <span className="eq-bar eq-bar-1" />
                        <span className="eq-bar eq-bar-2" />
                        <span className="eq-bar eq-bar-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listeners Section */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center gap-1 mb-2 shrink-0">
                {(["listeners", "requests", "approved"] as const).map((tab) => {
                  if (!isHost && tab !== "listeners") return null;
                  const count =
                    tab === "listeners"
                      ? listeners.length
                      : tab === "requests"
                        ? moderation.pending.length
                        : moderation.approved.length;
                  return (
                    <button
                      key={tab}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        roomPanel === tab
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => setRoomPanel(tab)}
                    >
                      {tab === "listeners" ? "Listeners" : tab === "requests" ? "Requests" : "Approved"} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="space-y-0.5 overflow-y-auto flex-1">
                {roomPanel === "listeners" && (
                  <>
                    {listeners.map((p) => (
                      <div
                        key={p.profile_id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors ${!p.is_guest ? "cursor-pointer" : ""}`}
                        onClick={() =>
                          !p.is_guest && p.profile?.username && navigate(`/profile/${p.profile.username}`)
                        }
                      >
                        <Avatar size="sm" className="h-7 w-7">
                          <AvatarImage src={p.profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {(p.profile?.username || "??").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {p.profile?.username || "Unknown"}
                        </span>
                      </div>
                    ))}
                    {listeners.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-4">
                        No listeners yet
                      </p>
                    )}
                  </>
                )}
                {isHost && roomPanel === "requests" && (
                  <>
                    {moderation.pending.map((request) => (
                      <div key={request.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                        <Avatar size="sm" className="h-7 w-7">
                          <AvatarImage src={request.requester?.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {(request.requester?.username || "??").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{request.requester?.username || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            wants to {request.type === "jam" ? "jam" : "listen"}
                          </p>
                        </div>
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleDecideAccessRequest(request.id, "approved")}>
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleDecideAccessRequest(request.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    ))}
                    {moderation.pending.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-4">No pending requests</p>
                    )}
                  </>
                )}
                {isHost && roomPanel === "approved" && (
                  <>
                    {moderation.approved.map((grant) => (
                      <div key={grant.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                        <Avatar size="sm" className="h-7 w-7">
                          <AvatarImage src={grant.profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {(grant.profile?.username || "??").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{grant.profile?.username || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            can {grant.type === "jam" ? "jam" : "listen"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleRevokeAccessGrant(grant.id)}>
                          Revoke
                        </Button>
                      </div>
                    ))}
                    {moderation.approved.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-4">No approved people yet</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-72 lg:w-80 xl:w-96 border-l border-border flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                Chat
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {participants.length} in room
              </span>
            </div>
            {isGuest && (
              <div className="px-4 py-2 text-xs text-muted-foreground/60 border-b border-border/30">
                Listening mode &mdash; sign in to chat
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60">
                  <p className="text-xs">No messages yet</p>
                  {!isGuest && (
                    <p className="text-xs mt-1">Start the conversation</p>
                  )}
                </div>
              ) : (
                messages.map((msg, i) => {
                  const prevMsg = messages[i - 1];
                  const showHeader =
                    !prevMsg ||
                    prevMsg.sender_id !== msg.sender_id ||
                    new Date(msg.created_at).getTime() -
                      new Date(prevMsg.created_at).getTime() >
                      5 * 60 * 1000;

                  return (
                    <div key={msg.id} className={showHeader ? "" : "pl-8"}>
                      {showHeader && (
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar size="sm" className="h-6 w-6 shrink-0">
                            <AvatarImage
                              src={msg.sender?.avatar_url || ""}
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                              {(msg.sender?.username || "??")
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold truncate max-w-[120px]">
                            {msg.sender?.username || "Unknown"}
                          </span>
                          <Timestamp
                            date={new Date(msg.created_at)}
                            className="text-[10px] text-muted-foreground"
                          >
                            {formatTime(msg.created_at)}
                          </Timestamp>
                        </div>
                      )}
                      <p
                        className={`text-sm whitespace-pre-wrap break-words ${showHeader ? "pl-8" : ""}`}
                      >
                        {censorText(msg.text, censorshipEnabled)}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {!isGuest && (
              <div className="px-4 py-3 border-t border-border shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 bg-muted/50 border-transparent focus:bg-background focus:border-border"
                  />
                  <Button type="submit" size="icon" disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(JamRoom);
