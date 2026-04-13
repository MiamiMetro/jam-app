import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApplyToBand, type BandListing } from "@/hooks/useBands";

const INSTRUMENTS = [
  "Vocal",
  "Guitar",
  "Bass",
  "Drums",
  "Keyboard",
  "Synthesizer",
  "Violin",
  "Saxophone",
  "Trumpet",
  "Flute",
  "Percussion",
  "Producer",
  "Other",
] as const;

interface BandApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: BandListing | null;
}

export function BandApplicationDialog({ open, onOpenChange, listing }: BandApplicationDialogProps) {
  const applyMutation = useApplyToBand();

  const [instrument, setInstrument] = useState<string>("Guitar");
  const [experience, setExperience] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!listing || !experience.trim()) return;
    setError(null);
    try {
      await applyMutation.mutateAsync({
        listingId: listing.id,
        instrument,
        experience: experience.trim(),
        message: message.trim() || undefined,
      });
      handleClose(false);
    } catch (err: any) {
      setError(err?.message || "Failed to apply.");
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setInstrument("Guitar");
      setExperience("");
      setMessage("");
      setError(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden surface-elevated">
        <DialogHeader className="space-y-0">
          <DialogTitle>
            Apply to {listing?.band_name || "Band"}
          </DialogTitle>
        </DialogHeader>

        {listing && (
          <div className="rounded-lg glass-solid px-3 py-2 mb-1">
            <p className="text-xs text-muted-foreground">
              Looking for <span className="text-primary font-medium">{listing.seeking_role}</span> •{" "}
              {listing.current_members}/{listing.max_members} members • {listing.region}
            </p>
          </div>
        )}

        <div className="space-y-4 w-full min-w-0">
          {/* Instrument */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Your Instrument *</label>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => setInstrument(inst)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                    instrument === inst
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                      : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Experience *</label>
            <Textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Tell them about your musical experience..."
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
            <p className="text-[10px] text-muted-foreground/60">Min 10 characters</p>
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Message (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Anything else you'd like them to know..."
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
              disabled={!experience.trim() || experience.trim().length < 10 || applyMutation.isPending}
              onClick={handleSubmit}
            >
              {applyMutation.isPending ? "Applying..." : "Send Application"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
