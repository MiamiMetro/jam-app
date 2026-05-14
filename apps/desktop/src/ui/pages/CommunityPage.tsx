// CommunityPage.tsx — Community detail page, standardized header like Profile
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Hash as HashIcon, Users, Settings2, Shield, UserMinus, ChevronUp, ChevronDown, Music, Plus, LayoutGrid, List, Lock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import {
  useCommunity,
  useMemberRole,
  useJoinCommunity,
  useLeaveCommunity,
  usePromoteMod,
  useDemoteMod,
  useRemoveMember,
  useCommunityMembers,
  useSearchCommunityMembers,
  useCommunityJamAvailability,
} from "@/hooks/useCommunities";
import { useCommunityPosts, useCreatePost, useToggleLike, useDeletePost } from "@/hooks/usePosts";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { SearchInput } from "@/components/SearchInput";
import { formatTimeAgo } from "@/lib/postUtils";
import { getCommunityColors } from "@/lib/communityColors";
import { EditCommunityDialog } from "@/components/community/EditCommunityDialog";
import type { FrontendPost } from "@/hooks/usePosts";
import { RoomFormDialog, type RoomFormData } from "@/components/RoomFormDialog";
import { RoomCard } from "@/components/RoomCard";
import type { Id } from "@jam-app/convex";
import {
  useCommunityRooms,
  useMyCommunityRoom,
  useCreateRoom,
  useUpdateRoom,
  useActivateRoom,
  useDeactivateRoom,
} from "@/hooks/useRooms";

type Tab = "feed" | "jam" | "moderation";

function CommunityPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest, user } = useAuthStore();

  const { data: community, isLoading } = useCommunity(handle || "");
  const memberRole = useMemberRole(community?.id ?? "");
  const isMember = memberRole !== null;
  const isOwner = memberRole === "owner";
  const isMod = memberRole === "mod";
  const canModerate = isOwner || isMod;

  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();
  const jamAvailability = useCommunityJamAvailability(community?.id ?? "");

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [editOpen, setEditOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [roomViewMode, setRoomViewMode] = useState<"grid" | "list">("grid");
  const [isTogglingRoom, setIsTogglingRoom] = useState(false);

  const {
    data: posts = [],
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityPosts(community?.id ?? "");
  const createPostMutation = useCreatePost();
  const toggleLikeMutation = useToggleLike();
  const deletePostMutation = useDeletePost();

  const {
    data: allMembers = [],
    isLoading: membersLoading,
    hasNextPage: hasMembersNextPage,
    fetchNextPage: fetchMoreMembers,
  } = useCommunityMembers(community?.id ?? "");
  const { data: searchedMembers = [], isLoading: searchLoading } =
    useSearchCommunityMembers(community?.id ?? "", memberSearch);

  const promoteMutation = usePromoteMod();
  const demoteMutation = useDemoteMod();
  const removeMutation = useRemoveMember();
  const { data: communityRooms = [], isLoading: communityRoomsLoading } =
    useCommunityRooms(community?.id ?? undefined);
  const { data: myCommunityRoom, isLoading: myCommunityRoomLoading } =
    useMyCommunityRoom(community?.id ?? undefined);
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const activateRoom = useActivateRoom();
  const deactivateRoom = useDeactivateRoom();

  const displayedMembers = memberSearch.length >= 2 ? searchedMembers : allMembers;
  const showJamTab = jamAvailability.data.enabled || communityRooms.length > 0;

  useEffect(() => {
    if (activeTab === "jam" && !showJamTab) {
      setActiveTab("feed");
    }
  }, [activeTab, showJamTab]);

  const handleJoin = async () => {
    if (!community) return;
    try { await joinMutation.mutateAsync(community.id); } catch {}
  };

  const handleLeave = async () => {
    if (!community) return;
    try { await leaveMutation.mutateAsync(community.id); } catch {}
  };

  const handleLikePost = async (postId: string) => {
    if (isGuest) return;
    try { await toggleLikeMutation.mutateAsync(postId); } catch {}
  };

  const handleCreatePost = async (content: string, audioFile: File | null) => {
    if (!community) return;
    await createPostMutation.mutateAsync({ content, audioFile, communityId: community.id });
  };

  const handleCreateRoom = async (data: RoomFormData) => {
    if (!community || isGuest || !user || !isMember) return;
    if (!data.name.trim()) return;

    try {
      await createRoom({
        handle: data.handle.trim(),
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxPerformers: data.maxPerformers,
        isPrivate: data.isPrivate,
        visibility: data.visibility,
        listenAccess: data.listenAccess,
        jamAccess: data.jamAccess,
        communityId: community.id as Id<"communities">,
      });
      setIsCreateRoomOpen(false);
    } catch (error) {
      console.error("Failed to create community room:", error);
    }
  };

  const handleUpdateRoom = async (data: RoomFormData) => {
    if (!community || isGuest || !user || !myCommunityRoom) return;
    if (!data.name.trim()) return;

    try {
      await updateRoom({
        roomId: myCommunityRoom.id as Id<"rooms">,
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxPerformers: data.maxPerformers,
        isPrivate: data.isPrivate,
        visibility: data.visibility,
        listenAccess: data.listenAccess,
        jamAccess: data.jamAccess,
      });
      setIsEditRoomOpen(false);
    } catch (error) {
      console.error("Failed to update community room:", error);
    }
  };

  const handleToggleRoomStatus = async () => {
    if (isGuest || !user || !myCommunityRoom) return;
    setIsTogglingRoom(true);
    try {
      if (myCommunityRoom.is_active) {
        await deactivateRoom({ roomId: myCommunityRoom.id as Id<"rooms"> });
      } else {
        await activateRoom({ roomId: myCommunityRoom.id as Id<"rooms"> });
      }
    } catch (error) {
      console.error("Failed to toggle community room:", error);
    } finally {
      setIsTogglingRoom(false);
    }
  };

  const editRoomInitialData: RoomFormData | undefined = myCommunityRoom
    ? {
        handle: myCommunityRoom.handle,
        name: myCommunityRoom.name,
        description: myCommunityRoom.description || "",
        genre: myCommunityRoom.genre || "",
        maxPerformers: myCommunityRoom.max_performers,
        isPrivate: myCommunityRoom.is_private,
        visibility: myCommunityRoom.visibility,
        listenAccess: myCommunityRoom.listen_access,
        jamAccess: myCommunityRoom.jam_access,
      }
    : undefined;

  const colors = getCommunityColors(community?.theme_color);

  const sharedHeader = (title: string) => (
    <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
      <button
        className="no-drag cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h2 className="text-sm font-heading font-semibold text-muted-foreground">{title}</h2>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {sharedHeader("Community")}
        <div className="flex-1 p-6"><LoadingState message="Loading community..." /></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-col h-full">
        {sharedHeader("Community")}
        <div className="flex-1 p-6"><EmptyState icon={HashIcon} title="Community not found" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Standardized full-width header — clean, like Profile */}
      <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <button
          className="no-drag cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-heading font-semibold text-muted-foreground truncate">
          {community.name}
        </h2>
      </div>

      {/* Full-width banner */}
      {community.banner_url ? (
        <div
          className="h-24 shrink-0 bg-cover bg-center border-b border-border"
          style={{ backgroundImage: `url(${community.banner_url})` }}
        />
      ) : (
        <div className={`h-24 shrink-0 border-b border-border ${colors.bg}`} />
      )}

      {/* Two-column body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: avatar + tabs + content */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          {/* Avatar + name row (overlaps banner like Profile) */}
          <div className="px-5 pt-4 pb-4 shrink-0 border-b border-border">
            <div className="flex items-end gap-4 -mt-12">
              <Avatar className={`h-20 w-20 shrink-0 ring-4 ring-background ${colors.ring} ring-offset-0`}>
                <AvatarImage src={community.avatar_url ?? ""} alt={community.name} />
                <AvatarFallback className={`${colors.avatarBg} ${colors.text} text-xl font-bold`}>
                  {community.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1 min-w-0">
                <h1 className="font-heading font-bold text-base truncate">{community.name}</h1>
                <p className={`text-xs ${colors.text}`}>#{community.handle}</p>
              </div>
              <div className="flex-1" />
              {!isGuest && (
                <div className="flex items-center gap-1.5 pb-1">
                  {isOwner && (
                    <button
                      className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                      onClick={() => setEditOpen(true)}
                      title="Edit community"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                  )}
                  {isMember && !isOwner ? (
                    <Button size="sm" variant="outline" onClick={handleLeave} disabled={leaveMutation.isPending}>
                      Leave
                    </Button>
                  ) : !isMember ? (
                    <Button size="sm" className="glow-primary" onClick={handleJoin} disabled={joinMutation.isPending}>
                      Join
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-4 px-5 border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("feed")}
              className={`text-sm py-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "feed"
                  ? "text-foreground border-b-primary font-medium"
                  : "text-muted-foreground border-b-transparent hover:text-foreground"
              }`}
            >
              Feed
            </button>
            {showJamTab && (
              <button
                onClick={() => setActiveTab("jam")}
                className={`text-sm py-2.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "jam"
                    ? "text-foreground border-b-primary font-medium"
                    : "text-muted-foreground border-b-transparent hover:text-foreground"
                }`}
              >
                Jam
              </button>
            )}
            {canModerate && (
              <button
                onClick={() => setActiveTab("moderation")}
                className={`text-sm py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "moderation"
                    ? "text-foreground border-b-primary font-medium"
                    : "text-muted-foreground border-b-transparent hover:text-foreground"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Moderation
              </button>
            )}
          </div>

          {/* Scrollable tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "feed" ? (
              <>
                {isMember && !isGuest && (
                  <div className="px-5 py-4 border-b border-border/50">
                    <ComposePost
                      placeholder={`Post to #${community.handle}...`}
                      onSubmit={handleCreatePost}
                      submitButtonText="Post"
                      textareaRows={2}
                      textareaMinHeight="60px"
                      maxLength={1000}
                      wrapperClassName="glass-solid rounded-lg p-3"
                      inputId="community-post-audio-upload"
                      isSubmitting={createPostMutation.isPending}
                    />
                  </div>
                )}
                {postsLoading ? (
                  <LoadingState message="Loading posts..." />
                ) : posts.length === 0 ? (
                  <EmptyState
                    icon={HashIcon}
                    title="No posts yet"
                    description={isMember ? "Be the first to post!" : "Join to start posting"}
                  />
                ) : (
                  <>
                    <div className="divide-y divide-border/30">
                      {posts.map((post: FrontendPost) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          isGuest={isGuest}
                          currentUsername={user?.username}
                          onAuthorClick={(u) => navigate(`/profile/${u}`)}
                          onCommunityClick={(h) => navigate(`/community/${h}`)}
                          onPostClick={(id) => navigate(`/post/${id}`, { state: { backgroundLocation: location } })}
                          onLike={handleLikePost}
                          onDelete={(id) => deletePostMutation.mutate(id)}
                          formatTimeAgo={formatTimeAgo}
                        />
                      ))}
                    </div>
                    <div className="p-4">
                      <LoadMoreButton hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
                    </div>
                  </>
                )}
              </>
            ) : activeTab === "jam" ? (
              <div className="px-5 py-4 space-y-4">
                {!isMember ? (
                  <div className="glass-solid rounded-lg p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Lock className="h-4 w-4 text-primary" />
                        Join to jam with this community
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Community rooms are visible, but only members can create rooms or start jamming.
                      </p>
                    </div>
                    {!isGuest && (
                      <Button size="sm" className="glow-primary shrink-0" onClick={handleJoin} disabled={joinMutation.isPending}>
                        Join
                      </Button>
                    )}
                  </div>
                ) : !jamAvailability.data.enabled ? (
                  <div className="glass-solid rounded-lg p-4 flex items-center gap-3">
                    <Lock className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Community jam is disabled</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The community owner needs to configure a jam server before rooms can be created or started.
                      </p>
                    </div>
                  </div>
                ) : null}

                {isMember && myCommunityRoom && (
                  <div className={`p-4 rounded-lg glass-strong relative overflow-hidden ${myCommunityRoom.is_active ? "ring-1 ring-primary/30" : "ring-1 ring-border"}`}>
                    {myCommunityRoom.is_active && (
                      <div className="absolute inset-0 bg-gradient-primary-tr pointer-events-none" />
                    )}
                    <div className="flex items-start justify-between gap-4 relative">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <HashIcon className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-base font-semibold truncate">
                            {myCommunityRoom.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${myCommunityRoom.is_active ? "bg-green-500/20 text-green-400" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                            {myCommunityRoom.is_active ? "Active" : "Disabled"}
                          </span>
                          {myCommunityRoom.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">My Community Room</p>
                        <h4 className="text-sm font-medium mb-1 text-muted-foreground">{myCommunityRoom.handle}</h4>
                        {myCommunityRoom.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{myCommunityRoom.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => myCommunityRoom.is_active && navigate(`/jam/${myCommunityRoom.handle}`)}
                            disabled={!myCommunityRoom.is_active}
                            className={myCommunityRoom.is_active ? "glow-primary" : ""}
                          >
                            {myCommunityRoom.is_active ? "Enter Room" : "Room Disabled"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setIsEditRoomOpen(true)}>
                            <Settings2 className="h-3 w-3 mr-1" />
                            Settings
                          </Button>
                          <Button
                            variant={myCommunityRoom.is_active ? "outline" : "default"}
                            size="sm"
                            onClick={handleToggleRoomStatus}
                            disabled={isTogglingRoom}
                          >
                            {myCommunityRoom.is_active ? "Disable" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <RoomFormDialog
                  open={isCreateRoomOpen}
                  onOpenChange={setIsCreateRoomOpen}
                  onSubmit={handleCreateRoom}
                  mode="create"
                />
                <RoomFormDialog
                  open={isEditRoomOpen}
                  onOpenChange={setIsEditRoomOpen}
                  onSubmit={handleUpdateRoom}
                  mode="edit"
                  initialData={editRoomInitialData}
                />

                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-3 -mx-5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1" />
                    <div className="flex items-center gap-0.5 p-0.5 rounded-md glass-solid shrink-0">
                      <button
                        onClick={() => setRoomViewMode("grid")}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${roomViewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRoomViewMode("list")}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${roomViewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isMember && !isGuest && jamAvailability.data.enabled && !myCommunityRoom && !myCommunityRoomLoading && (
                      <Button variant="default" size="sm" className="shrink-0" onClick={() => setIsCreateRoomOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Create Room
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    Community Rooms
                  </h3>
                  {communityRoomsLoading ? (
                    <LoadingState message="Loading community rooms..." />
                  ) : communityRooms.length === 0 ? (
                    <EmptyState
                      icon={Music}
                      title="No community jams"
                      description={isMember ? "Create a room to start jamming here." : "Join the community to start jamming."}
                    />
                  ) : roomViewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
                      {communityRooms.map((room) => (
                        <RoomCard key={room.id} room={room} onClick={(roomHandle) => navigate(`/jam/${roomHandle}`)} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {communityRooms.map((room) => (
                        <RoomCard key={room.id} room={room} onClick={(roomHandle) => navigate(`/jam/${roomHandle}`)} variant="list" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <SearchInput placeholder="Search members..." value={memberSearch} onSearch={setMemberSearch} />
                {(membersLoading && !memberSearch) || (searchLoading && memberSearch.length >= 2) ? (
                  <LoadingState message="Loading members..." />
                ) : displayedMembers.length === 0 ? (
                  <EmptyState icon={Users} title="No members found" />
                ) : (
                  <>
                    <div className="space-y-1">
                      {displayedMembers.map((member: any) => {
                        const isOwnerRow = member.role === "owner";
                        const isModRow = member.role === "mod";
                        const isMemberRow = member.role === "member";
                        const isSelf = member.username === user?.username;
                        return (
                          <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                            <button onClick={() => navigate(`/profile/${member.username}`)} className="shrink-0 cursor-pointer">
                              <Avatar size="sm">
                                <AvatarImage src={member.avatar_url ?? ""} alt={member.username} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {member.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                            <div className="flex-1 min-w-0">
                              <button onClick={() => navigate(`/profile/${member.username}`)} className="text-sm font-medium hover:underline cursor-pointer truncate block text-left">
                                {member.username}
                              </button>
                              {member.display_name && <p className="text-xs text-muted-foreground truncate">{member.display_name}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isOwnerRow && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Owner</span>}
                              {isModRow && <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.text}`}>Mod</span>}
                              {!isSelf && !isOwnerRow && (
                                <>
                                  {isOwner && isModRow && (
                                    <button onClick={() => demoteMutation.mutate({ communityId: community.id, profileId: member.id })} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Demote mod">
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {isOwner && isMemberRow && (
                                    <button onClick={() => promoteMutation.mutate({ communityId: community.id, profileId: member.id })} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Promote to mod">
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {(isOwner || (isMod && isMemberRow)) && (
                                    <button onClick={() => removeMutation.mutate({ communityId: community.id, profileId: member.id })} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Remove member">
                                      <UserMinus className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!memberSearch && (
                      <LoadMoreButton hasNextPage={hasMembersNextPage} isFetchingNextPage={false} fetchNextPage={fetchMoreMembers} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — community info */}
        <div className="w-64 shrink-0 flex flex-col border-l border-border overflow-y-auto min-w-0">
          <div className="p-4 space-y-3 min-w-0 w-full">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Users className="h-3.5 w-3.5" />
              <span>{community.members_count} member{community.members_count !== 1 ? "s" : ""}</span>
            </div>
            {community.description && (
              <p className="text-xs text-muted-foreground leading-relaxed wrap-break-word">{community.description}</p>
            )}
            {community.tags && community.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {community.tags.map((tag: string) => (
                  <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.text}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <EditCommunityDialog open={editOpen} onOpenChange={setEditOpen} community={community} />
      )}
    </div>
  );
}

export default CommunityPage;
