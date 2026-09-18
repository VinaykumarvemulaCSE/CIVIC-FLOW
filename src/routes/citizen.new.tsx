import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, LocateFixed, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createComplaint, useSession } from "@/lib/civic/store";
import { formatCoords, nearestZone } from "@/lib/civic/geo";
import { detectCategory, scoreSeverity } from "@/lib/civic/triage";
import { CATEGORY_LABEL, ZONES, type Category } from "@/lib/civic/types";

export const Route = createFileRoute("/citizen/new")({
  head: () => ({
    meta: [
      { title: "Report an issue — CivicFlow AI" },
      {
        name: "description",
        content: "Send a photo, location and description; triage happens automatically.",
      },
      { property: "og:title", content: "Report an issue — CivicFlow AI" },
      {
        property: "og:description",
        content: "Send a photo, location and description; triage happens automatically.",
      },
    ],
  }),
  component: NewComplaint,
});

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

function NewComplaint() {
  const session = useSession();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState<string>(ZONES[0]!);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [busy, setBusy] = useState(false);

  const suggested = detectCategory(`${title} ${description}`);
  const preview = scoreSeverity(`${title} ${description}`, 1);

  function onDescription(value: string) {
    setDescription(value);
    if (!categoryTouched) {
      const next = detectCategory(`${title} ${value}`);
      if (next !== "other") setCategory(next);
    }
  }

  /**
   * Uploads the photo to Cloudinary if credentials are set in .env.
   * Otherwise, falls back to a base64 data URL for local testing.
   */
  async function pickPhoto(file?: File) {
    if (!file) return;
    if (file.size > 12_000_000) {
      toast.error("Please pick an image under 12 MB.");
      return;
    }
    setPhotoBusy(true);
    
    try {
      const cloudName = import.meta.env['VITE_CLOUDINARY_CLOUD_NAME'];
      const uploadPreset = import.meta.env['VITE_CLOUDINARY_UPLOAD_PRESET'];
      
      if (cloudName && uploadPreset) {
        // --- Cloudinary Upload ---
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        
        toast.info("Uploading image...");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Cloudinary upload failed");
        
        const data = await res.json();
        setPhotoUrl(data.secure_url);
        toast.success("Image uploaded!");
      } else {
        // --- Fallback: Base64 Compression ---
        console.warn("Cloudinary not configured. Falling back to base64 compression.");
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        setPhotoUrl(canvas.toDataURL("image/jpeg", 0.72));
      }
    } catch (error) {
      console.error(error);
      setPhotoUrl(URL.createObjectURL(file));
      toast.warning("Photo attached locally, but cloud upload failed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function useGps() {
    if (!("geolocation" in navigator)) {
      toast.error("This device cannot share location.");
      return;
    }
    toast.info("Reading your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setZone(nearestZone({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
        if (!address.trim()) {
          setAddress(
            `Lat ${pos.coords.latitude.toFixed(5)}, Lng ${pos.coords.longitude.toFixed(5)} (GPS pin)`,
          );
        }
        toast.success("Location captured");
      },
      () => toast.error("Location permission denied — type the address instead."),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 6) {
      toast.error("Give the issue a short title.");
      return;
    }
    if (description.trim().length < 15) {
      toast.error("Add a bit more detail so the agents can score it.");
      return;
    }
    if (!address.trim()) {
      toast.error("Add an address or use GPS.");
      return;
    }
    setBusy(true);
    const complaint = createComplaint({
      title: title.trim(),
      description: description.trim(),
      category,
      address: address.trim(),
      zone,
      citizenName: session?.name ?? "Citizen",
      ...(session?.email ? { citizenEmail: session.email } : {}),
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      photoUrl,
    });
    toast.success(`Complaint received — ticket ${complaint.ticket}`);
    navigate({ to: "/citizen/complaint/$ticket", params: { ticket: complaint.ticket } });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">What is the issue?</Label>
            <Input
              id="title"
              placeholder="Deep pothole near school gate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Describe it</Label>
            <Textarea
              id="desc"
              rows={5}
              placeholder="Where exactly is it, how big, is anyone at risk, how long has it been there?"
              value={description}
              onChange={(e) => onDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Mention risks like schools, night-time darkness or flooding — the severity agent looks
              for them.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as Category);
                  setCategoryTouched(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suggested !== "other" && suggested !== category && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory(suggested);
                    setCategoryTouched(true);
                  }}
                  className="flex items-center gap-1 text-xs text-accent-foreground underline"
                >
                  <Sparkles className="size-3" /> Agent suggests {CATEGORY_LABEL[suggested]}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Ward / zone</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addr">Location</Label>
            <div className="flex gap-2">
              <Input
                id="addr"
                placeholder="12 Market Road, near the school gate"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={useGps}>
                <LocateFixed className="size-4" /> Use my location
              </Button>
            </div>
            {coords && (
              <p className="inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs">
                <LocateFixed className="size-3" /> GPS pin captured · {formatCoords(coords)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Photo (optional but speeds up triage)</Label>
            {photoUrl ? (
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Selected"
                  className="max-h-64 w-full rounded-md border object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2"
                  onClick={() => setPhotoUrl(undefined)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed p-8 text-sm text-muted-foreground hover:border-accent"
              >
                <Camera className="size-6 text-accent" />
                {photoBusy ? "Preparing photo…" : "Tap to add a photo of the issue"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            Submit complaint
          </Button>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="space-y-4 p-5">
          <h3 className="font-display text-base font-bold uppercase tracking-wide">
            Pre-submit read
          </h3>
          <p className="text-xs text-muted-foreground">
            A local preview of what the agent chain will see. The real run happens on submit.
          </p>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Likely category
              </p>
              <p className="font-medium">{CATEGORY_LABEL[category]}</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Likely severity
              </p>
              <p className="font-medium capitalize">{preview.severity}</p>
              {preview.hits.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Risk words: {preview.hits.slice(0, 4).join(", ")}
                </p>
              )}
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Photo</p>
              <p className="font-medium">
                {photoUrl ? "Attached — image analysis queued" : "None attached"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
