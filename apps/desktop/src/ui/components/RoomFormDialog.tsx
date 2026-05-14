// RoomFormDialog.tsx — Shared create/edit room dialog with glass styling
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { EyeOff, Globe, Lock, Minus, Plus, Radio, UserCheck, Users } from "lucide-react";
import { ROOM_GENRES } from "@/hooks/useRooms";

export interface RoomFormData {
  handle: string;
  name: string;
  description: string;
  genre: string;
  maxPerformers: number;
  isPrivate: boolean;
  visibility: "public" | "unlisted" | "private";
  listenAccess: "anyone" | "friends" | "approved";
  jamAccess: "anyone" | "friends" | "approved" | "host";
}

const EMPTY_FORM: RoomFormData = {
  handle: "",
  name: "",
  description: "",
  genre: "",
  maxPerformers: 5,
  isPrivate: false,
  visibility: "public",
  listenAccess: "anyone",
  jamAccess: "anyone",
};

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Listed in Open Rooms", icon: Globe },
  { value: "unlisted", label: "Unlisted", description: "Link only, not listed", icon: EyeOff },
  { value: "private", label: "Private", description: "Only allowed people", icon: Lock },
] as const;

const LISTEN_OPTIONS = [
  { value: "anyone", label: "Anyone", description: "Anyone can listen", icon: Users },
  { value: "friends", label: "Friends", description: "Friends can listen", icon: UserCheck },
  { value: "approved", label: "Approved", description: "Request required", icon: Lock },
] as const;

const JAM_OPTIONS = [
  { value: "anyone", label: "Anyone", description: "Anyone can jam", icon: Radio },
  { value: "friends", label: "Friends", description: "Friends can jam", icon: UserCheck },
  { value: "approved", label: "Approved", description: "Request to jam", icon: Lock },
  { value: "host", label: "Host", description: "Only you can jam", icon: Lock },
] as const;

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RoomFormData) => void;
  isPending?: boolean;
  mode: "create" | "edit";
  initialData?: RoomFormData;
}

function RoomFormBody({
  initialData,
  onSubmit,
  isPending,
  isCreate,
}: {
  initialData: RoomFormData;
  onSubmit: (data: RoomFormData) => void;
  isPending: boolean;
  isCreate: boolean;
}) {
  const [form, setForm] = useState<RoomFormData>(initialData);
  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  const submitLabel = isCreate
    ? isPending ? "Creating..." : "Create Room"
    : isPending ? "Saving..." : "Save Changes";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {isCreate && (
          <div className="space-y-1">
            <Label htmlFor="room-handle" className="text-xs font-medium text-muted-foreground">Handle</Label>
            <div className="flex items-center gap-0">
              <span className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 border border-r-0 border-transparent rounded-l-md">jam/</span>
              <Input
                id="room-handle"
                placeholder="chill-vibes"
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                className="h-8 bg-muted/50 border-transparent focus:bg-background focus:border-border rounded-l-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60">Permanent URL handle. Letters, numbers, hyphens, underscores.</p>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="room-name" className="text-xs font-medium text-muted-foreground">Room Name</Label>
          <Input
            id="room-name"
            placeholder="e.g., Chill Vibes"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-8 bg-muted/50 border-transparent focus:bg-background focus:border-border"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="room-description" className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/50">(Optional)</span></Label>
          <Textarea
            id="room-description"
            placeholder="What's this room about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={1}
            className="min-h-14 bg-muted/50 border-transparent focus:bg-background focus:border-border resize-none"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Genre <span className="text-muted-foreground/50">(Optional)</span></Label>
          <div className="flex gap-1 flex-wrap">
            {ROOM_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, genre: form.genre === g ? "" : g })}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                  form.genre === g
                    ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                    : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Max Performers</Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, maxPerformers: Math.max(2, form.maxPerformers - 1) })}
              className="h-8 w-8 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{form.maxPerformers}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, maxPerformers: Math.min(7, form.maxPerformers + 1) })}
              className="h-8 w-8 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <OptionGrid
          label="Visibility"
          options={VISIBILITY_OPTIONS}
          value={form.visibility}
          onChange={(visibility) =>
            setForm({ ...form, visibility, isPrivate: visibility === "private" })
          }
        />
        <OptionGrid
          label="Who can listen"
          options={LISTEN_OPTIONS}
          value={form.listenAccess}
          onChange={(listenAccess) => setForm({ ...form, listenAccess })}
        />
        <OptionGrid
          label="Who can jam"
          options={JAM_OPTIONS}
          value={form.jamAccess}
          onChange={(jamAccess) => setForm({ ...form, jamAccess })}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-border/60 pt-3 mt-3 shrink-0">
        <DialogClose render={<Button variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          onClick={() => onSubmit(form)}
          disabled={!form.name.trim() || (isCreate && !form.handle.trim()) || isPending}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function OptionGrid<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly {
    value: T;
    label: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }[];
  value: T;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className={`grid gap-1.5 ${options.length > 3 ? "grid-cols-4" : "grid-cols-3"}`}>
        {options.map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              title={option.description}
              className={`flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 rounded-md transition-all duration-200 cursor-pointer ${
                selected
                  ? "glass-strong ring-1 ring-primary/30 text-foreground"
                  : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-border"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${selected ? "text-primary" : ""}`} />
              <span className="truncate text-xs font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RoomFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  mode,
  initialData,
}: RoomFormDialogProps) {
  const isCreate = mode === "create";
  const title = isCreate ? "Create Your Room" : "Edit Room Settings";
  const description = isCreate
    ? "Create your personal jam room. You can only have one room, but you can manage its settings anytime."
    : "Update your room settings. Changes will apply immediately.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100vh-2rem)] p-4 flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <RoomFormBody
          initialData={initialData ?? EMPTY_FORM}
          onSubmit={onSubmit}
          isPending={isPending}
          isCreate={isCreate}
        />
      </DialogContent>
    </Dialog>
  );
}
