import { useRef } from "react";
import { Plus, Trash2, GripVertical, ImagePlus, X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialStepData } from "@shared/schema";

interface Props {
  steps: TutorialStepData[];
  onChange: (steps: TutorialStepData[]) => void;
  readOnly?: boolean;
}

const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30 MB

function ImageSlot({
  dataUrl, mimeType, onChange, readOnly,
}: { dataUrl?: string | null; mimeType?: string | null; onChange: (url: string | null, mime: string | null) => void; readOnly?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) { alert("Image must be under 30 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, file.type);
    reader.readAsDataURL(file);
  };

  if (dataUrl) {
    return (
      <div className="relative group w-full rounded-xl overflow-hidden border border-border/60 bg-muted/30">
        <img src={dataUrl} alt="Step illustration" className="w-full max-h-64 object-contain" />
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Remove image"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  if (readOnly) return null;

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-colors group"
      data-testid="upload-step-image"
    >
      <ImagePlus size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
        Add step photo
      </span>
      <span className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP — max 30 MB</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </button>
  );
}

export default function TutorialStepEditor({ steps, onChange, readOnly = false }: Props) {
  const addStep = () => {
    onChange([
      ...steps,
      { stepNumber: steps.length + 1, title: "", instruction: "", tip: null, imageDataUrl: null, imageMimeType: null },
    ]);
  };

  const removeStep = (i: number) => {
    const next = steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    onChange(next);
  };

  const update = (i: number, patch: Partial<TutorialStepData>) => {
    onChange(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...steps];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const moveDown = (i: number) => {
    if (i === steps.length - 1) return;
    const next = [...steps];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  return (
    <div className="space-y-4">
      {steps.length === 0 && !readOnly && (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">No steps yet. Add your first folding step.</p>
          <button type="button" onClick={addStep} className="flex items-center gap-1.5 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-display font-700 hover:opacity-90 transition-opacity" data-testid="add-first-step">
            <Plus size={14} /> Add Step 1
          </button>
        </div>
      )}

      {steps.map((step, i) => (
        <div key={i} className={cn("bg-card border border-border/60 rounded-2xl overflow-hidden", !readOnly && "hover:border-border transition-colors")}>
          {/* Step header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
            {!readOnly && (
              <div className="flex flex-col gap-0.5 cursor-ns-resize text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <button type="button" onClick={() => moveUp(i)} className="leading-none hover:text-foreground" aria-label="Move step up">▲</button>
                <button type="button" onClick={() => moveDown(i)} className="leading-none hover:text-foreground" aria-label="Move step down">▼</button>
              </div>
            )}
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-display font-800 text-primary">{step.stepNumber}</span>
            </div>
            {!readOnly ? (
              <input
                type="text"
                value={step.title}
                onChange={e => update(i, { title: e.target.value })}
                placeholder={`Step ${step.stepNumber} title, e.g. "Fold in half lengthwise"`}
                className="flex-1 bg-transparent text-sm font-display font-700 text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
                data-testid={`step-title-${i}`}
              />
            ) : (
              <span className="flex-1 text-sm font-display font-700 text-foreground">{step.title}</span>
            )}
            {!readOnly && (
              <button type="button" onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" aria-label="Remove step" data-testid={`remove-step-${i}`}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Step body */}
          <div className="p-4 grid sm:grid-cols-2 gap-4">
            {/* Left: text */}
            <div className="space-y-3">
              {!readOnly ? (
                <textarea
                  value={step.instruction}
                  onChange={e => update(i, { instruction: e.target.value })}
                  placeholder="Describe this folding step clearly. What does the person need to do with the paper? What should the result look like?"
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 resize-none transition-colors leading-relaxed"
                  data-testid={`step-instruction-${i}`}
                />
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">{step.instruction}</p>
              )}

              {/* Tip */}
              <div className={cn("flex items-start gap-2 rounded-xl px-3 py-2.5", readOnly && !step.tip ? "hidden" : "", readOnly ? "bg-accent/10 border border-accent/20" : "bg-muted/30 border border-border/50")}>
                <Lightbulb size={13} className={cn("mt-0.5 flex-shrink-0", readOnly ? "text-accent" : "text-muted-foreground")} />
                {!readOnly ? (
                  <input
                    type="text"
                    value={step.tip ?? ""}
                    onChange={e => update(i, { tip: e.target.value || null })}
                    placeholder="Optional tip or common mistake to avoid…"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none"
                    data-testid={`step-tip-${i}`}
                  />
                ) : (
                  <span className="text-xs text-foreground/70">{step.tip}</span>
                )}
              </div>
            </div>

            {/* Right: image */}
            <ImageSlot
              dataUrl={step.imageDataUrl}
              mimeType={step.imageMimeType}
              readOnly={readOnly}
              onChange={(url, mime) => update(i, { imageDataUrl: url, imageMimeType: mime })}
            />
          </div>
        </div>
      ))}

      {!readOnly && steps.length > 0 && (
        <button
          type="button"
          onClick={addStep}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-primary transition-colors font-display font-700"
          data-testid="add-step"
        >
          <Plus size={14} /> Add Step {steps.length + 1}
        </button>
      )}
    </div>
  );
}
