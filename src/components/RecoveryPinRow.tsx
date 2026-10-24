import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasSecurityQuestion, setSecurityQuestion, SECURITY_QUESTIONS } from "@/lib/auth-rpc";

export function RecoveryPinRow() {
  const [status, setStatus] = useState<{ has: boolean; question: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasSecurityQuestion().then(setStatus).catch(() => setStatus(null));
  }, []);

  const submit = async () => {
    const clean = answer.trim().toLowerCase();
    if (!question) return void toast.error("Select a question");
    if (clean.length < 2) return void toast.error("Answer must be at least 2 characters");
    setBusy(true);
    try {
      const r = await setSecurityQuestion(question, clean);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Security question & answer saved!");
      setStatus({ has: true, question });
      setOpen(false);
      setAnswer("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-4 mt-4 rounded-2xl bg-card border">
      <div className="flex items-center gap-3 p-4">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary/15 text-primary shrink-0">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Security Recovery Question</p>
          <p className="text-xs text-muted-foreground">
            {status === null
              ? "Checking…"
              : status.has
              ? `Set: "${status.question}"`
              : "Not set — set one now so you can recover your password easily"}
          </p>
        </div>
      </div>
      {open ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Select Question</label>
            <select
              className="w-full h-11 px-3 text-sm rounded-lg border bg-background text-foreground"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Your Secret Answer</label>
            <Input
              className="h-11 text-base lowercase"
              type="text"
              placeholder="e.g. dog, sharma, delhi"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Small letters or numbers. Case doesn't matter when recovering.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 font-semibold" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 font-semibold" disabled={busy} onClick={submit}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="w-full border-t text-left p-4 text-sm text-primary font-semibold hover:bg-primary/5 transition-colors"
          onClick={() => setOpen(true)}
        >
          {status?.has ? "Change recovery question" : "Set recovery question"}
        </button>
      )}
    </section>
  );
}
