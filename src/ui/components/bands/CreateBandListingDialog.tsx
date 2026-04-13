import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateBandListing, useActiveListingCount } from "@/hooks/useBands";

const SEEKING_ROLES = [
  "Vocalist",
  "Guitarist",
  "Bassist",
  "Drummer",
  "Keyboardist",
  "Producer",
  "Other",
] as const;

const GENRES = [
  "Rock",
  "Metal",
  "Pop",
  "Jazz",
  "Blues",
  "Electronic",
  "Hip Hop",
  "R&B",
  "Reggae",
  "Classical",
  "Indie",
  "Acoustic",
  "LoFi",
  "Punk",
  "Alternative",
  "Other",
] as const;

interface CreateBandListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function clampMembers(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CreateBandListingDialog({ open, onOpenChange }: CreateBandListingDialogProps) {
  const createMutation = useCreateBandListing();
  const activeCount = useActiveListingCount();

  const [bandName, setBandName] = useState("");
  const [currentMembers, setCurrentMembers] = useState(1);
  const [maxMembers, setMaxMembers] = useState(5);
  const [seekingRole, setSeekingRole] = useState<string>("Guitarist");
  const [region, setRegion] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const atLimit = activeCount >= 3;

  const handleSubmit = async () => {
    if (!bandName.trim() || !region.trim()) return;
    setError(null);
    try {
      await createMutation.mutateAsync({
        bandName: bandName.trim(),
        currentMembers,
        maxMembers,
        seekingRole,
        region: region.trim(),
        description: description.trim() || undefined,
        genre: genre || undefined,
      });
      handleClose(false);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to create listing."));
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setBandName("");
      setCurrentMembers(1);
      setMaxMembers(5);
      setSeekingRole("Guitarist");
      setRegion("");
      setGenre("");
      setDescription("");
      setError(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden surface-elevated">
        <DialogHeader className="space-y-0">
          <DialogTitle>Create Band Listing</DialogTitle>
        </DialogHeader>

        {atLimit && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            You've reached the limit of 3 active listings. Close or delete an existing one first.
          </p>
        )}

        <div className="space-y-4 w-full min-w-0">
          {/* Band Name */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Band Name *</label>
            <Input
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              maxLength={50}
              placeholder="Your band name"
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {/* Members */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Current Members</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMembers((value) => clampMembers(value - 1, 1, maxMembers))}
                  disabled={currentMembers <= 1}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">
                  {currentMembers}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMembers((value) => clampMembers(value + 1, 1, maxMembers))
                  }
                  disabled={currentMembers >= maxMembers}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Total Capacity</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMaxMembers((value) => {
                      const nextValue = clampMembers(value - 1, 2, 50);
                      setCurrentMembers((currentValue) => Math.min(currentValue, nextValue));
                      return nextValue;
                    })
                  }
                  disabled={maxMembers <= 2}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">
                  {maxMembers}
                </span>
                <button
                  type="button"
                  onClick={() => setMaxMembers((value) => clampMembers(value + 1, 2, 50))}
                  disabled={maxMembers >= 50}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Seeking Role */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Looking For *</label>
            <div className="flex flex-wrap gap-1.5">
              {SEEKING_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSeekingRole(role)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                    seekingRole === role
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                      : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Region *</label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              maxLength={100}
              placeholder="e.g. Istanbul, Ankara, İzmir..."
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Genre</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(genre === g ? "" : g)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                    genre === g
                      ? "bg-primary/15 text-primary border-primary/20"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell people about your band and what kind of musician you're looking for..."
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="glow-primary"
              disabled={!bandName.trim() || !region.trim() || createMutation.isPending || atLimit}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? "Creating..." : "Create Listing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
