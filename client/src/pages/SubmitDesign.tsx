import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Send, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import TutorialStepEditor from "@/components/TutorialStepEditor";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { TutorialStepData } from "@shared/schema";

const PLANE_TYPES = ["Glider","Distance","Stunt","Speed","Acrobatic"];
const PAPER_SIZES = ["A4","A3","A5","Letter","Half Letter"];
const FLYING_STYLES = ["Long glide","Fast & straight","Looping","Acrobatic","Slow & stable","Compact & agile"];

export default function SubmitDesign() {
  const [submitted, setSubmitted] = useState(false);
  const [steps, setSteps] = useState<TutorialStepData[]>([]);
  const [form, setForm] = useState({
    name: "", authorName: "", authorEmail: "",
    type: "Glider", difficulty: 2, paperSize: "A4",
    flyingStyle: "", throwingTips: "", description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/community/designs", data),
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => alert("Submission failed: " + (e.message ?? "Unknown error")),
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Plane name is required";
    if (!form.authorName.trim()) e.authorName = "Your name is required";
    if (steps.length === 0) e.steps = "Add at least one folding step";
    if (steps.some(s => !s.title.trim() || !s.instruction.trim())) e.steps = "All steps need a title and instruction";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ ...form, steps: JSON.stringify(steps) });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-primary" />
        </div>
        <h1 className="font-display font-900 text-2xl text-foreground mb-3">Design submitted!</h1>
        <p className="text-muted-foreground mb-2 leading-relaxed">
          Thanks for contributing to the community. Your design is under review and will appear in the Tutorials section once approved.
        </p>
        <p className="text-xs text-muted-foreground mb-8">Usually reviewed within 24 hours.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/tutorials">
            <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-700 text-sm hover:opacity-90 transition-opacity">Browse Tutorials</button>
          </Link>
          <button onClick={() => { setSubmitted(false); setForm({ name:"",authorName:"",authorEmail:"",type:"Glider",difficulty:2,paperSize:"A4",flyingStyle:"",throwingTips:"",description:"" }); setSteps([]); }} className="px-5 py-2.5 rounded-xl bg-muted text-foreground font-display font-700 text-sm hover:bg-secondary transition-colors border border-border">
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/tutorials">
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Tutorials
        </button>
      </Link>

      <div className="mb-8">
        <h1 className="font-display font-900 text-2xl text-foreground mb-2">Submit Your Plane Design</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Share your own plane design with the community. Fill in the details, then build a step-by-step tutorial — you can attach a photo to each step to show exactly what to do.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* ── Plane Info ─────────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-800 text-sm text-foreground mb-1">About the Plane</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs mb-1.5 block">Plane name <span className="text-destructive">*</span></Label>
              <Input id="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder='e.g. "The Phoenix"' className={cn("text-sm", errors.name && "border-destructive")} data-testid="input-plane-name" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="authorName" className="text-xs mb-1.5 block">Your name <span className="text-destructive">*</span></Label>
              <Input id="authorName" value={form.authorName} onChange={e => set("authorName", e.target.value)} placeholder='e.g. "Jamie K."' className={cn("text-sm", errors.authorName && "border-destructive")} data-testid="input-author-name" />
              {errors.authorName && <p className="text-xs text-destructive mt-1">{errors.authorName}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="authorEmail" className="text-xs mb-1.5 block">Email <span className="text-muted-foreground">(optional — we'll notify you when approved)</span></Label>
            <Input id="authorEmail" type="email" value={form.authorEmail} onChange={e => set("authorEmail", e.target.value)} placeholder="you@example.com" className="text-sm max-w-sm" data-testid="input-author-email" />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Briefly describe this plane — what makes it special? What is it good at?" rows={3} className="text-sm resize-none" data-testid="input-description" />
          </div>
        </section>

        {/* ── Specs ──────────────────────────────────────────────────── */}
        <section className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-800 text-sm text-foreground mb-1">Specs</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger className="text-xs h-9" data-testid="select-type"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANE_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Paper size</Label>
              <Select value={form.paperSize} onValueChange={v => set("paperSize", v)}>
                <SelectTrigger className="text-xs h-9" data-testid="select-paper-size"><SelectValue /></SelectTrigger>
                <SelectContent>{PAPER_SIZES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Difficulty</Label>
              <Select value={String(form.difficulty)} onValueChange={v => set("difficulty", +v)}>
                <SelectTrigger className="text-xs h-9" data-testid="select-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["1","Beginner"],["2","Easy"],["3","Intermediate"],["4","Advanced"],["5","Expert"]].map(([v,l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Flying style</Label>
              <Select value={form.flyingStyle} onValueChange={v => set("flyingStyle", v)}>
                <SelectTrigger className="text-xs h-9" data-testid="select-flying-style"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{FLYING_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="throwingTips" className="text-xs mb-1.5 block">Throwing tip <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="throwingTips" value={form.throwingTips} onChange={e => set("throwingTips", e.target.value)} placeholder='e.g. "Firm overhead throw at 20° upward — let it float"' className="text-sm" data-testid="input-throwing-tips" />
          </div>
        </section>

        {/* ── Tutorial Steps ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-800 text-sm text-foreground">Folding Steps <span className="text-destructive">*</span></h2>
              <p className="text-xs text-muted-foreground mt-0.5">Add each folding step in order. A photo for each step makes a huge difference — snap a picture of the paper at that stage.</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
          </div>
          {errors.steps && <p className="text-xs text-destructive mb-3 flex items-center gap-1">⚠ {errors.steps}</p>}
          <TutorialStepEditor steps={steps} onChange={setSteps} />
        </section>

        {/* ── Submit ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground max-w-xs">Submissions are reviewed before appearing publicly. Usually within 24 hours.</p>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-700 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            data-testid="btn-submit-design"
          >
            <Send size={14} />
            {mutation.isPending ? "Submitting…" : "Submit Design"}
          </button>
        </div>
      </form>
    </div>
  );
}
