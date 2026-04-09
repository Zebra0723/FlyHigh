import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Heart, X, Play, CheckCircle, Upload, Camera, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { GalleryItem, PlaneWithStats } from "@shared/schema";

const MAX_IMAGE = 4 * 1024 * 1024;  // 4 MB
const MAX_VIDEO = 30 * 1024 * 1024; // 30 MB

function GalleryCard({ item, onLike }: { item: GalleryItem; onLike: (id: number) => void }) {
  const [lightbox, setLightbox] = useState(false);
  const date = new Date(item.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden group hover:border-primary/30 transition-all">
        {/* Media */}
        <div
          className="relative cursor-pointer bg-muted/40 aspect-[4/3] overflow-hidden"
          onClick={() => setLightbox(true)}
        >
          {item.mediaType === "video" ? (
            <div className="w-full h-full flex items-center justify-center">
              <video
                src={item.dataUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-background/70 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play size={18} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={item.dataUrl}
              alt={item.caption || "Paper plane"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          )}
          <div className="absolute top-2 right-2">
            {item.mediaType === "video"
              ? <span className="flex items-center gap-1 bg-background/80 text-[10px] font-700 font-display px-2 py-0.5 rounded-full border border-border/50"><Film size={9} /> VIDEO</span>
              : <span className="flex items-center gap-1 bg-background/80 text-[10px] font-700 font-display px-2 py-0.5 rounded-full border border-border/50"><Camera size={9} /> PHOTO</span>
            }
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          {item.caption && <p className="text-xs text-foreground leading-relaxed mb-2 line-clamp-2">{item.caption}</p>}
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground leading-tight">
              <span className="font-500 text-foreground/70">{item.uploaderName}</span>
              {item.linkedPlaneName && <> · <span className="text-primary">{item.linkedPlaneName}</span></>}
              <br />{date}
            </div>
            <button
              onClick={() => onLike(item.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400 transition-colors group/like"
              data-testid={`like-${item.id}`}
            >
              <Heart size={13} className="group-hover/like:fill-rose-400 group-hover/like:text-rose-400 transition-all" />
              <span>{item.likes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border border-border">
          {item.mediaType === "video"
            ? <video src={item.dataUrl} controls className="w-full max-h-[80vh] object-contain bg-black" />
            : <img src={item.dataUrl} alt={item.caption || "Paper plane"} className="w-full max-h-[80vh] object-contain bg-muted/20" />
          }
          {(item.caption || item.uploaderName) && (
            <div className="p-4 border-t border-border">
              {item.caption && <p className="text-sm text-foreground mb-1">{item.caption}</p>}
              <p className="text-xs text-muted-foreground">Uploaded by {item.uploaderName}{item.linkedPlaneName ? ` · ${item.linkedPlaneName}` : ""}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; mime: string } | null>(null);
  const [form, setForm] = useState({ uploaderName: "", caption: "", linkedPlaneName: "" });
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: planes } = useQuery<PlaneWithStats[]>({ queryKey: ["/api/planes"] });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gallery", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/gallery"] }); setDone(true); },
    onError: (e: any) => setErr(e.message ?? "Upload failed"),
  });

  const handleFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const limit = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (file.size > limit) { setErr(`File too large. Max ${isVideo ? "30 MB for video" : "4 MB for images"}.`); return; }
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview({ url: reader.result as string, type: isVideo ? "video" : "image", mime: file.type });
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!mediaPreview) { setErr("Please select a photo or video"); return; }
    if (!form.uploaderName.trim()) { setErr("Please enter your name"); return; }
    mutation.mutate({
      uploaderName: form.uploaderName,
      caption: form.caption,
      mediaType: mediaPreview.type,
      dataUrl: mediaPreview.url,
      mimeType: mediaPreview.mime,
      linkedPlaneName: form.linkedPlaneName || null,
    });
  };

  const reset = () => { setDone(false); setMediaPreview(null); setForm({ uploaderName:"", caption:"", linkedPlaneName:"" }); setErr(null); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-800">Share to Gallery</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-8">
            <CheckCircle size={40} className="text-primary mx-auto mb-3" />
            <h3 className="font-display font-700 text-foreground mb-1">Uploaded!</h3>
            <p className="text-sm text-muted-foreground mb-4">Your submission is under review and will appear in the gallery once approved.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity">Done</button>
              <button onClick={reset} className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-display font-700 border border-border hover:bg-secondary transition-colors">Upload another</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone / preview */}
            {!mediaPreview ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-colors group"
                data-testid="gallery-drop-zone"
              >
                <Upload size={22} className="text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-display font-700 text-muted-foreground group-hover:text-primary transition-colors">Click to select photo or video</span>
                <span className="text-xs text-muted-foreground/60">JPG, PNG, WebP up to 4 MB · MP4, MOV up to 30 MB</span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-muted/30 border border-border">
                {mediaPreview.type === "video"
                  ? <video src={mediaPreview.url} controls className="w-full max-h-48 object-contain" />
                  : <img src={mediaPreview.url} alt="Preview" className="w-full max-h-48 object-contain" />
                }
                <button onClick={() => setMediaPreview(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 border border-border flex items-center justify-center hover:text-destructive transition-colors">
                  <X size={13} />
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Your name <span className="text-destructive">*</span></Label>
                <Input value={form.uploaderName} onChange={e => setForm(f => ({ ...f, uploaderName: e.target.value }))} placeholder='e.g. "Jamie K."' className="text-sm h-9" data-testid="input-uploader-name" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Plane <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={form.linkedPlaneName} onValueChange={v => setForm(f => ({ ...f, linkedPlaneName: v === "none" ? "" : v }))}>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Tag a plane…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">No plane</SelectItem>
                    {(planes ?? []).map(p => <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Caption <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Tell us about this plane or moment…" rows={2} className="text-sm resize-none" data-testid="input-caption" />
            </div>

            {err && <p className="text-xs text-destructive">{err}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { onClose(); reset(); }} className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-display font-700 border border-border hover:bg-secondary transition-colors">Cancel</button>
              <button type="button" onClick={submit} disabled={mutation.isPending} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 disabled:opacity-50 transition-opacity" data-testid="btn-upload">
                <Upload size={13} /> {mutation.isPending ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Gallery() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery<GalleryItem[]>({ queryKey: ["/api/gallery"] });

  const likeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/gallery/${id}/like`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/gallery"] }),
  });

  const filtered = (items ?? []).filter(item => filter === "all" || item.mediaType === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-900 text-2xl text-foreground flex items-center gap-3 mb-2">
            <Camera size={22} className="text-primary" /> Community Gallery
          </h1>
          <p className="text-muted-foreground text-sm">Photos and videos of planes from the community. Show us what you've made.</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity flex-shrink-0"
          data-testid="btn-share-photo"
        >
          <ImagePlus size={14} /> Share a Photo / Video
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all","image","video"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-display font-700 transition-colors border",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:text-foreground"
            )}
            data-testid={`filter-${f}`}
          >
            {f === "all" ? "All" : f === "image" ? "Photos" : "Videos"}
            {f !== "all" && <span className="ml-1.5 text-[10px] opacity-70">{(items ?? []).filter(i => i.mediaType === f).length}</span>}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Camera size={48} className="text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-display font-800 text-foreground mb-2">No photos yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Be the first to share a photo or video of your plane.</p>
          <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity">
            <ImagePlus size={14} /> Share Now
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <GalleryCard key={item.id} item={item} onLike={id => likeMutation.mutate(id)} />
          ))}
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
