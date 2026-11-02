import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { labels, type Entry, type Party } from "@/lib/ledger";
import { inr } from "@/lib/format";
import { compressReceiptImage, formatBytes, uploadReceipt, type CompressResult } from "@/lib/compress";
import { Camera, Image, X } from "lucide-react";
import { cn } from "@/lib/utils";

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => localIso(new Date());
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localIso(d);
};

export function EntrySheet({
  open,
  onOpenChange,
  party,
  direction: initialDirection,
  onSaved,
  edit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  party: Party;
  direction: "gave" | "got";
  onSaved: (e: Entry, newBalance: number) => void;
  /** When set, the sheet edits this existing entry instead of adding a new one. */
  edit?: Entry | null;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [direction, setDirection] = useState(initialDirection);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [receipt, setReceipt] = useState<CompressResult | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const l = labels(party.kind);
  const isGot = direction === "got";

  useEffect(() => {
    if (open) {
      setAmount(edit ? String(edit.amount) : "");
      setNote(edit?.note ?? "");
      setDate(edit ? localIso(new Date(edit.entry_date)) : today());
      setDueDate(edit?.due_date ?? "");
      setDirection(edit ? edit.direction : initialDirection);
      setReceipt((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return null;
      });
    }
  }, [open, edit, initialDirection]);

  const amt = Number(amount) || 0;

  const handleReceipt = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return void toast.error("Choose an image smaller than 20 MB");
    setCompressing(true);
    try {
      const result = await compressReceiptImage(file);
      setReceipt((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return result;
      });
      toast.success(`Compressed to ${formatBytes(result.compressedSize)} (${result.savedPercent}% smaller)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not process this image");
    } finally {
      setCompressing(false);
    }
  };

  const removeReceipt = () => {
    if (receipt) URL.revokeObjectURL(receipt.previewUrl);
    setReceipt(null);
    if (cameraInput.current) cameraInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
  };

  // When editing, remove the old entry's effect before applying the new values.
  const base = edit ? party.balance - (edit.direction === "gave" ? edit.amount : -edit.amount) : party.balance;
  const projected = base + (isGot ? -amt : amt);
  const due = Math.abs(base);
  // Quick "settle full" helper: amount that brings balance to zero in this direction
  const canSettle = (isGot && base > 0) || (!isGot && base < 0);

  const save = async () => {
    if (amt <= 0) return void toast.error("Enter an amount");
    setSaving(true);
    const isToday = date === today();
    const entry_date = edit && date === localIso(new Date(edit.entry_date))
      ? edit.entry_date
      : isToday ? new Date().toISOString() : new Date(date + "T12:00:00").toISOString();
    let bill_path: string | null = edit?.bill_path ?? null;
    try {
      if (receipt) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) throw new Error("Please sign in again before uploading a receipt");
        bill_path = await uploadReceipt({ userId, partyId: party.id, blob: receipt.blob, mimeType: receipt.mimeType });
      }
    } catch (error) {
      setSaving(false);
      return void toast.error(error instanceof Error ? error.message : "Receipt upload failed");
    }
    const fields = {
      direction,
      amount: amt,
      note: note.trim() || null,
      entry_date,
      bill_path,
      due_date: direction === "gave" && dueDate ? dueDate : null,
    };
    const { data, error } = edit
      ? await supabase.from("entries").update(fields).eq("id", edit.id).select().single()
      : await supabase.from("entries").insert({ party_id: party.id, ...fields }).select().single();
    setSaving(false);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["entries", party.id] });
    qc.invalidateQueries({ queryKey: ["party", party.id] });
    qc.invalidateQueries({ queryKey: ["parties"] });
    qc.invalidateQueries({ queryKey: ["dues"] });
    onOpenChange(false);
    if (edit) toast.success("Entry updated");
    void import("@/lib/push").then((m) => m.notifyParty(party.id));
    onSaved({ ...data, amount: Number(data.amount) } as Entry, projected);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh] flex flex-col focus:outline-none">
        <div className="mx-auto flex h-full max-h-[92dvh] w-full max-w-md flex-1 flex-col overflow-hidden min-h-0">
          {/* Header */}
          <DrawerHeader className="shrink-0 px-4 pt-2 pb-1.5 text-left">
            <DrawerTitle className={cn("font-display text-xl sm:text-2xl font-bold", isGot ? "text-gain" : "text-loss")}>
              {edit ? "Edit · " : ""}{isGot ? l.got : l.gave} · {party.name}
            </DrawerTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">{isGot ? l.gotHint : l.gaveHint}</p>
            {edit && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant={!isGot ? "default" : "outline"} className="h-8 text-xs" onClick={() => setDirection("gave")}>{l.gave}</Button>
                <Button type="button" size="sm" variant={isGot ? "default" : "outline"} className="h-8 text-xs" onClick={() => setDirection("got")}>{l.got}</Button>
              </div>
            )}
          </DrawerHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-3.5 overscroll-contain">
            {/* Amount input */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">₹</span>
              <Input
                autoFocus
                inputMode="decimal"
                className="h-14 pl-10 text-2xl sm:text-3xl font-bold"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
              />
            </div>

            {/* Quick Settle chips */}
            {canSettle && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5" onClick={() => setAmount(String(due))}>
                  Full {inr(due)}
                </Button>
                <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5" onClick={() => setAmount(String(Math.round(due / 2)))}>
                  Half {inr(Math.round(due / 2))}
                </Button>
              </div>
            )}

            {/* Bill / receipt photo section */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Bill / receipt photo (optional)</Label>
              {/* Native camera trigger */}
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handleReceipt(e.target.files?.[0])}
              />
              {/* Native gallery / file picker trigger */}
              <input
                ref={galleryInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleReceipt(e.target.files?.[0])}
              />

              {receipt ? (
                <div className="relative flex items-center gap-3 rounded-xl border bg-card p-2 shadow-xs">
                  <img src={receipt.previewUrl} alt="Compressed receipt preview" className="h-14 w-14 rounded-lg object-cover shrink-0 border" />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-foreground">Photo ready to upload</p>
                    <p className="text-muted-foreground mt-0.5">{formatBytes(receipt.compressedSize)} · {receipt.savedPercent}% smaller</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={removeReceipt}
                    aria-label="Remove receipt photo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-center gap-2 text-xs sm:text-sm font-medium"
                    onClick={() => cameraInput.current?.click()}
                    disabled={compressing}
                  >
                    <Camera className="h-4 w-4 text-primary shrink-0" />
                    <span>{compressing ? "Processing…" : "Take photo"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-center gap-2 text-xs sm:text-sm font-medium"
                    onClick={() => galleryInput.current?.click()}
                    disabled={compressing}
                  >
                    <Image className="h-4 w-4 text-primary shrink-0" />
                    <span>{compressing ? "Processing…" : "Choose from gallery"}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Date & Note side by side */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="edate" className="text-xs text-muted-foreground">Date</Label>
                <Input id="edate" type="date" className="h-11 text-xs sm:text-sm" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enote" className="text-xs text-muted-foreground">Note</Label>
                <Input id="enote" className="h-11 text-xs sm:text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bill no, items…" />
              </div>
            </div>

            {/* Payment promise date (only for credit given to a customer) */}
            {!isGot && party.kind === "customer" && (
              <div className="space-y-1.5 rounded-xl border border-accent/40 bg-accent/10 p-2.5">
                <Label className="text-xs font-semibold">Payment promise date — उधार कब मिलेगा? (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 7, 15].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={dueDate === plusDays(n) ? "default" : "outline"}
                      className="h-8 text-xs px-3"
                      onClick={() => setDueDate(dueDate === plusDays(n) ? "" : plusDays(n))}
                    >
                      +{n} days
                    </Button>
                  ))}
                  <Input
                    type="date"
                    aria-label="Custom due date"
                    className="h-8 w-[9.5rem] text-xs"
                    value={dueDate}
                    min={today()}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  {dueDate && (
                    <Button type="button" size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setDueDate("")}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Pinned Footer with Save button */}
          <div className="shrink-0 border-t bg-background/95 backdrop-blur-xs px-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2">
            {amt > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span>New balance:</span>
                <span className={cn("font-semibold", projected > 0 ? "text-gain" : projected < 0 ? "text-loss" : "")}>
                  {inr(projected)} {projected > 0 ? "you'll get" : projected < 0 ? "you'll give" : "settled"}
                </span>
              </div>
            )}
            <Button
              className={cn(
                "w-full h-12 text-base font-semibold shadow-sm",
                isGot ? "bg-gain hover:bg-gain/90 text-gain-foreground" : "bg-loss hover:bg-loss/90 text-loss-foreground"
              )}
              onClick={save}
              disabled={saving || compressing}
            >
              {saving ? "Saving…" : edit ? "Update entry" : "Save entry"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
