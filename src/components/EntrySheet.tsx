import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { labels, type Entry, type Party } from "@/lib/ledger";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

export function EntrySheet({
  open,
  onOpenChange,
  party,
  direction,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  party: Party;
  direction: "gave" | "got";
  onSaved: (e: Entry, newBalance: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const l = labels(party.kind);
  const isGot = direction === "got";

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setDate(today());
    }
  }, [open]);

  const amt = Number(amount) || 0;
  const projected = party.balance + (isGot ? -amt : amt);
  const due = Math.abs(party.balance);
  // Quick "settle full" helper: amount that brings balance to zero in this direction
  const canSettle = (isGot && party.balance > 0) || (!isGot && party.balance < 0);

  const save = async () => {
    if (amt <= 0) return toast.error("Enter an amount");
    setSaving(true);
    const isToday = date === today();
    const entry_date = isToday ? new Date().toISOString() : new Date(date + "T12:00:00").toISOString();
    const { data, error } = await supabase
      .from("entries")
      .insert({ party_id: party.id, direction, amount: amt, note: note.trim() || null, entry_date })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["entries", party.id] });
    qc.invalidateQueries({ queryKey: ["party", party.id] });
    qc.invalidateQueries({ queryKey: ["parties"] });
    onOpenChange(false);
    onSaved({ ...data, amount: Number(data.amount) } as Entry, projected);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className={cn("font-display text-2xl", isGot ? "text-gain" : "text-loss")}>
              {isGot ? l.got : l.gave} · {party.name}
            </DrawerTitle>
            <p className="text-sm text-muted-foreground">{isGot ? l.gotHint : l.gaveHint}</p>
          </DrawerHeader>
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">₹</span>
              <Input
                autoFocus
                inputMode="decimal"
                className="h-16 pl-10 text-3xl font-bold"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
              />
            </div>
            {canSettle && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAmount(String(due))}>
                  Full {inr(due)}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setAmount(String(Math.round(due / 2)))}>
                  Half {inr(Math.round(due / 2))}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edate">Date</Label>
                <Input id="edate" type="date" className="h-12" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enote">Note</Label>
                <Input id="enote" className="h-12" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bill no, items…" />
              </div>
            </div>
            {amt > 0 && (
              <p className="text-sm text-muted-foreground">
                New balance:{" "}
                <span className={cn("font-semibold", projected > 0 ? "text-gain" : projected < 0 ? "text-loss" : "")}>
                  {inr(projected)} {projected > 0 ? "you'll get" : projected < 0 ? "you'll give" : "settled"}
                </span>
              </p>
            )}
            <Button
              className={cn("w-full h-12 text-base", isGot ? "bg-gain hover:bg-gain/90 text-gain-foreground" : "bg-loss hover:bg-loss/90 text-loss-foreground")}
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
