import { useState } from "react";
import { ChevronDown, ChevronUp, X, XCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBandApplications, useCloseBandListing, useDeleteBandListing, type BandListing } from "@/hooks/useBands";
import { LoadMoreButton } from "@/components/LoadMoreButton";

interface MyBandListingCardProps {
  listing: BandListing;
}

export function MyBandListingCard({ listing }: MyBandListingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const closeMutation = useCloseBandListing();
  const deleteMutation = useDeleteBandListing();
  const {
    data: applications,
    isLoading: appsLoading,
    hasNextPage,
    fetchNextPage,
  } = useBandApplications(expanded ? listing.id : "");

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync(listing.id);
    } catch {
      // Error handling is implicit — Convex will report errors
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this listing? All applications will also be deleted.")) return;
    try {
      await deleteMutation.mutateAsync(listing.id);
    } catch {
      // Error handling is implicit
    }
  };

  const isClosed = listing.status === "closed";

  return (
    <div className={`rounded-xl glass-strong border border-border/50 overflow-hidden transition-all ${isClosed ? "opacity-60" : ""}`}>
      {/* Listing Info */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-heading font-semibold text-sm truncate">{listing.band_name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isClosed
                ? "bg-muted text-muted-foreground"
                : "bg-green-500/15 text-green-400"
            }`}>
              {isClosed ? "Closed" : "Open"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isClosed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={closeMutation.isPending}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Close
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span>{listing.current_members}/{listing.max_members} members</span>
          <span className="text-primary font-medium">Looking for: {listing.seeking_role}</span>
          <span>{listing.region}</span>
          {listing.genre && <span>• {listing.genre}</span>}
        </div>

        {listing.description && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-2">{listing.description}</p>
        )}

        {/* Applications toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {listing.applications_count} Application{listing.applications_count !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Expanded applications */}
      {expanded && (
        <div className="border-t border-border/30 px-4 py-2">
          {appsLoading ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">No applications yet</p>
          ) : (
            <div className="space-y-2.5 py-1">
              {applications.map((app) => (
                <div key={app.id} className="flex gap-3 py-2 border-b border-border/20 last:border-0">
                  <Avatar size="sm" className="shrink-0 mt-0.5">
                    <AvatarImage src={app.applicant?.avatar_url || ""} alt={app.applicant?.username || ""} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                      {app.applicant?.username?.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium truncate">{app.applicant?.username || "Unknown"}</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{app.instrument}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-0.5">{app.experience}</p>
                    {app.message && (
                      <p className="text-xs text-muted-foreground/70 italic">"{app.message}"</p>
                    )}
                  </div>
                </div>
              ))}
              <LoadMoreButton
                hasNextPage={hasNextPage}
                isFetchingNextPage={false}
                fetchNextPage={fetchNextPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
