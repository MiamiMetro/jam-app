import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCommunityJamServerSettings,
  useUpdateCommunity,
  useUpdateCommunityJamServerSettings,
  type Community,
} from "@/hooks/useCommunities";
import { COMMUNITY_THEME_COLOR_KEYS, COMMUNITY_TAGS, getCommunityColors } from "@/lib/communityColors";
import { getErrorMessage } from "@/lib/errors";

interface EditCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: Community;
}

export function EditCommunityDialog({ open, onOpenChange, community }: EditCommunityDialogProps) {
  const updateMutation = useUpdateCommunity();
  const jamSettings = useCommunityJamServerSettings(community.id, open);
  const updateJamSettings = useUpdateCommunityJamServerSettings();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState("purple");
  const [tags, setTags] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jamEnabled, setJamEnabled] = useState(false);
  const [jamName, setJamName] = useState("");
  const [jamHost, setJamHost] = useState("");
  const [jamPort, setJamPort] = useState(9999);
  const [jamServerId, setJamServerId] = useState("");
  const [jamRegion, setJamRegion] = useState("");
  const [jamSecret, setJamSecret] = useState("");
  const [jamError, setJamError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when community data arrives or dialog opens
  useEffect(() => {
    if (!community) return;
    const timer = window.setTimeout(() => {
      setName(community.name ?? "");
      setDescription(community.description ?? "");
      setThemeColor(community.theme_color ?? "purple");
      setTags(community.tags ?? []);
      setAvatarUrl(community.avatar_url ?? "");
      setBannerUrl(community.banner_url ?? "");
      setPendingAvatarFile(null);
      setPendingBannerFile(null);
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [community, open]);

  useEffect(() => {
    const settings = jamSettings.data;
    if (!settings) return;
    const timer = window.setTimeout(() => {
      setJamEnabled(settings.enabled);
      setJamName(settings.name);
      setJamHost(settings.host);
      setJamPort(settings.port);
      setJamServerId(settings.serverId);
      setJamRegion(settings.region);
      setJamSecret("");
      setJamError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [jamSettings.data, open]);

  const handlePickImage = (kind: "avatar" | "banner", file: File) => {
    const objectUrl = URL.createObjectURL(file);
    if (kind === "avatar") {
      setPendingAvatarFile(file);
      setAvatarUrl(objectUrl);
    } else {
      setPendingBannerFile(file);
      setBannerUrl(objectUrl);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      const result = await updateMutation.mutateAsync({
        communityId: community.id,
        name: name.trim(),
        description: description.trim() || undefined,
        themeColor,
        tags,
        avatarFile: pendingAvatarFile,
        bannerFile: pendingBannerFile,
        avatarUrl: pendingAvatarFile ? undefined : avatarUrl,
        bannerUrl: pendingBannerFile ? undefined : bannerUrl,
      });
      setAvatarUrl(result.avatar_url ?? "");
      setBannerUrl(result.banner_url ?? "");
      setPendingAvatarFile(null);
      setPendingBannerFile(null);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update community."));
    }
  };

  const jamErrorMessage = (err: unknown) => {
    const message = getErrorMessage(err, "");
    if (message.includes("COMMUNITY_JAM_SERVER_ACTIVE_EDIT_BLOCKED")) {
      return "Stop active jam sessions before changing server settings.";
    }
    if (message.includes("COMMUNITY_JAM_SERVER_SECRET_REQUIRED")) {
      return "Set a join secret before saving jam settings.";
    }
    if (message.includes("INVALID_PORT")) {
      return "Port must be between 1 and 65535.";
    }
    if (message.includes("INVALID_SERVER_HOST")) {
      return "Enter a hostname or IP without protocol, path, or port.";
    }
    return message || "Failed to update jam settings.";
  };

  const handleSaveJamSettings = async () => {
    setJamError(null);
    try {
      await updateJamSettings.mutateAsync({
        communityId: community.id,
        enabled: jamEnabled,
        name: jamName.trim(),
        host: jamHost.trim(),
        port: jamPort,
        serverId: jamServerId.trim(),
        joinSecret: jamSecret.trim() || undefined,
        region: jamRegion.trim() || undefined,
      });
      setJamSecret("");
    } catch (err) {
      setJamError(jamErrorMessage(err));
    }
  };

  const colors = getCommunityColors(themeColor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden surface-elevated">
        <DialogHeader className="space-y-0">
          <DialogTitle>Edit Community</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 w-full min-w-0">
          {/* Banner */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Banner</p>
            <div
              className="h-24 w-full rounded-lg border border-border glass-solid bg-cover bg-center"
              style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
            />
            <div className="flex items-center gap-2">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePickImage("banner", file);
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => bannerInputRef.current?.click()}>
                Select Banner
              </Button>
              {bannerUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setBannerUrl(""); setPendingBannerFile(null); }}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Avatar</p>
            <div className="flex items-center gap-3">
              <Avatar size="lg" className={`ring-2 ${colors.ring}`}>
                <AvatarImage src={avatarUrl || ""} alt={community.name} />
                <AvatarFallback className={`${colors.avatarBg} ${colors.text} font-bold`}>
                  {community.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePickImage("avatar", file);
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                Select Avatar
              </Button>
              {avatarUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAvatarUrl(""); setPendingAvatarFile(null); }}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Handle (read-only) */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Handle (immutable)</label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">#</span>
              <Input
                value={community.handle}
                readOnly
                disabled
                className="opacity-60 bg-muted/50 border-transparent"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Community name"
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What's this community about?"
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {/* Theme Color */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Theme Color</p>
            <div className="flex flex-wrap gap-2">
              {COMMUNITY_THEME_COLOR_KEYS.map((key) => {
                const c = getCommunityColors(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeColor(key)}
                    className={`h-7 w-7 rounded-full transition-all ${c.avatarBg} ${
                      themeColor === key ? `ring-2 ring-offset-2 ring-offset-background ${c.ring}` : ""
                    }`}
                    title={key}
                  />
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tags ({tags.length}/5)</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNITY_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={!selected && tags.length >= 5}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selected
                        ? `${colors.badgeBg} ${colors.text} border-current/20`
                        : "bg-background border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jam server settings */}
          <div className="space-y-3 rounded-lg border border-border/60 p-3 glass-solid">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Jam Server</p>
                <p className="text-xs text-muted-foreground">
                  Community-hosted performer rooms use this SFU.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJamEnabled((value) => !value)}
                disabled={jamSettings.data?.activeEditBlocked}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  jamEnabled
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                } disabled:opacity-50`}
              >
                {jamEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            {jamSettings.data?.activeEditBlocked && (
              <p className="text-xs text-amber-400">
                Stop active jam sessions before changing server settings.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  value={jamName}
                  onChange={(e) => setJamName(e.target.value)}
                  disabled={jamSettings.data?.activeEditBlocked}
                  placeholder="Community SFU"
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Server ID</label>
                <Input
                  value={jamServerId}
                  onChange={(e) => setJamServerId(e.target.value)}
                  disabled={jamSettings.data?.activeEditBlocked}
                  placeholder="my-community"
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Host</label>
                <Input
                  value={jamHost}
                  onChange={(e) => setJamHost(e.target.value)}
                  disabled={jamSettings.data?.activeEditBlocked}
                  placeholder="127.0.0.1"
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">UDP Port</label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={jamPort}
                  onChange={(e) => setJamPort(Number(e.target.value))}
                  disabled={jamSettings.data?.activeEditBlocked}
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Region</label>
                <Input
                  value={jamRegion}
                  onChange={(e) => setJamRegion(e.target.value)}
                  disabled={jamSettings.data?.activeEditBlocked}
                  placeholder="optional"
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Join Secret {jamSettings.data?.hasSecret ? "(set)" : ""}
                </label>
                <Input
                  type="password"
                  value={jamSecret}
                  onChange={(e) => setJamSecret(e.target.value)}
                  disabled={jamSettings.data?.activeEditBlocked}
                  placeholder={jamSettings.data?.hasSecret ? "Leave blank to keep" : "Required"}
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
            </div>

            {jamError && <p className="text-sm text-destructive">{jamError}</p>}

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  updateJamSettings.isPending ||
                  jamSettings.data?.activeEditBlocked ||
                  !jamName.trim() ||
                  !jamHost.trim() ||
                  !jamServerId.trim()
                }
                onClick={handleSaveJamSettings}
              >
                {updateJamSettings.isPending ? "Saving..." : "Save Jam Settings"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="glow-primary"
              disabled={!name.trim() || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
