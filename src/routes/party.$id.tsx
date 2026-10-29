import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileDown, MessageCircle, Phone, Share2, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EntrySheet } from "@/components/EntrySheet";
import { ShareDialog, shareNative, shareWhatsApp } from "@/components/ShareDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { balanceText, labels, receiptMessage, useEntries, useParty, useProfile, type Entry } from "@/lib/ledger";
import { fmtDate, fmtTime, inr, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { downloadStatement, type Range } from "@/lib/pdf";
import { Dialog as ImageDialog, DialogContent as ImageDialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/party/$id")({
  head: () => ({
    meta: [
      { title: "Passbook — LenaDena" },
      { name: "description", content: "Full transaction history and running balance." },
      { property: "og:title", content: "Passbook — LenaDena" },
      { property: "og:description", content: "Customer and supplier passbook with running balance." },
    ],
  }),
  component: PartyPage,
});

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monthRange = (offset: number): Range => {
  const now = new Date();
  return { from: iso(new Date(now.getFullYear(), now.getMonth() + offset, 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)) };
};

function PartyPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);
  const { data: party, isLoading } = useParty(id);
  const { data: entries } = useEntries(id);
  const [dir, setDir] = useState<"gave" | "got" | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [del, setDel] = useState<Entry | "party" | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [range, setRange] = useState<Range>({});
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const rows = useMemo(() => {
    let run = 0;
    return (entries ?? []).map((e) => {
      run += e.direction === "gave" ? e.amount : -e.amount;
      return { ...e, running: run };
    }).reverse();
  }, [entries]);

  if (isLoading) return <div className="p-6 max-w-md mx-auto"><Skeleton className="h-40 rounded-2xl" /></div>;
  if (!party)
    return (
      <div className="p-6 text-center">
        <p>Not found.</p>
        <Link to="/" className="text-primary underline">Back</Link>
      </div>
    );

  const l = labels(party.kind);
  const business = profile?.business_name;
  const reminder = receiptMessage({ business, party, balance: party.balance });

  const confirmDelete = async () => {
    if (!del) return;
    if (del === "party") {
      const { error } = await supabase.from("parties").delete().eq("id", party.id);
      if (error) return void toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["parties"] });
      navigate({ to: "/" });
    } else {
      const { error } = await supabase.from("entries").delete().eq("id", del.id);
      if (error) return void toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["entries", party.id] });
      qc.invalidateQueries({ queryKey: ["party", party.id] });
      qc.invalidateQueries({ queryKey: ["parties"] });
      toast.success("Entry deleted");
    }
    setDel(null);
  };

  const viewReceipt = async (path: string) => {
    try {
      setLoadingReceipt(path);
      // Try signed URL (works for private bucket)
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 60);
      if (!error && data?.signedUrl) {
        setImageToView(data.signedUrl);
        return;
      }
      // Fallback to public URL (works when bucket is public)
      const { data: pub } = supabase.storage.from("receipts").getPublicUrl(path);
      if (pub?.publicUrl) {
        setImageToView(pub.publicUrl);
        return;
      }
      toast.error(error?.message ?? "Could not open receipt photo");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not open receipt photo");
    } finally {
      setLoadingReceipt(null);
    }
  };

  const savePdf = async (r: Range) => {
    try {
      await downloadStatement(party, entries ?? [], business, r);
      setPdfOpen(false);
      toast.success("Statement downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto pb-32">
      <header className="bg-primary text-primary-foreground px-4 pt-5 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="grid place-items-center h-10 w-10 rounded-full bg-accent text-accent-foreground font-semibold">{initials(party.name)}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{party.name}</h1>
            <p className="text-xs opacity-75 capitalize">{party.kind}{party.phone ? ` · ${party.phone}` : ""}</p>
          </div>
          {party.phone && (
            <a href={`tel:${party.phone}`} className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Call">
              <Phone className="h-5 w-5" />
            </a>
          )}
          {!party.shared && <button onClick={() => setDel("party")} className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Delete party">
            <Trash2 className="h-5 w-5" />
          </button>}
        </div>
        <div className="mt-5 rounded-2xl bg-card text-card-foreground p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{balanceText(party.balance)}</p>
            <p className={cn("text-3xl font-extrabold font-display", party.balance > 0 ? "text-gain" : party.balance < 0 ? "text-loss" : "")}>
              {inr(party.balance)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="icon" className="h-11 w-11 rounded-full bg-whatsapp hover:bg-whatsapp/90 text-gain-foreground" onClick={() => shareWhatsApp(party.phone, reminder)} aria-label="WhatsApp reminder">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-11 w-11 rounded-full" aria-label="Download PDF" onClick={() => setPdfOpen(true)}>
              <FileDown className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-11 w-11 rounded-full" onClick={() => shareNative(reminder)} aria-label="Share">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 flex text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="flex-1">Entry</span>
        <span className="w-20 text-right">{l.gave}</span>
        <span className="w-20 text-right">{l.got}</span>
      </div>
      <ul className="mt-1 px-2 space-y-1.5">
        {rows.length === 0 && <li className="text-center text-muted-foreground py-12">No entries yet. Add the first one below.</li>}
        {rows.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => setShare(receiptMessage({ business, party, entry: e, balance: e.running }))}
              onContextMenu={(ev) => { ev.preventDefault(); if (!party.shared) setDel(e); }}
              className="w-full flex items-center rounded-xl bg-card border px-3 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{fmtDate(e.entry_date)} <span className="text-muted-foreground text-xs">{fmtTime(e.entry_date)}</span></p>
                {e.note && <p className="text-xs text-muted-foreground truncate">{e.note}</p>}
                {e.bill_path && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-primary"
                    onClick={(ev) => { ev.stopPropagation(); void viewReceipt(e.bill_path!); }}
                    aria-label="View receipt photo"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> View bill photo
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">Bal. {inr(e.running)} {e.running > 0 ? "get" : e.running < 0 ? "give" : ""}</p>
              </div>
              <span className="w-20 text-right font-semibold text-loss">{e.direction === "gave" ? inr(e.amount) : ""}</span>
              <span className="w-20 text-right font-semibold text-gain">{e.direction === "got" ? inr(e.amount) : ""}</span>
              {!party.shared && <span
                role="button"
                aria-label="Delete entry"
                className="ml-2 p-1 text-muted-foreground"
                onClick={(ev) => { ev.stopPropagation(); setDel(e); }}
              >
                <Trash2 className="h-4 w-4" />
              </span>}
            </button>
          </li>
        ))}
      </ul>

      {party.shared ? (
        <p className="fixed bottom-0 inset-x-0 bg-secondary text-center text-sm text-muted-foreground p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          Shared by {party.name} · updates live
        </p>
      ) : <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button className="h-14 text-base bg-loss hover:bg-loss/90 text-loss-foreground" onClick={() => setDir("gave")}>
            {l.gave} ₹
          </Button>
          <Button className="h-14 text-base bg-gain hover:bg-gain/90 text-gain-foreground" onClick={() => setDir("got")}>
            {l.got} ₹
          </Button>
        </div>
      </div>}

      <EntrySheet
        open={!!dir}
        onOpenChange={(o) => !o && setDir(null)}
        party={party}
        direction={dir ?? "got"}
        onSaved={(entry, bal) => setShare(receiptMessage({ business, party, entry, balance: bal }))}
      />
      <ShareDialog open={!!share} onOpenChange={(o) => !o && setShare(null)} text={share ?? ""} phone={party.phone} title="Share receipt" />

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{del === "party" ? `Delete ${party.name}?` : "Delete this entry?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {del === "party" ? "All entries for this person will be permanently removed." : "The balance will be recalculated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageDialog open={!!imageToView} onOpenChange={(open) => !open && setImageToView(null)}>
        <ImageDialogContent className="max-w-md sm:max-w-lg p-4 bg-background">

          <DialogHeader className="pb-2 pr-8">
            <DialogTitle className="text-base font-semibold flex items-center justify-between gap-3">
              <span>Bill / Receipt Photo</span>

              {imageToView && (
                <a
                  href={imageToView}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-primary underline font-normal"
                >
                  Open original
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          {imageToView && (
            <div className="rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center p-1">
              <img src={imageToView} alt="Bill or receipt" className="max-h-[75vh] w-full rounded-md object-contain" />
            </div>
          )}
        </ImageDialogContent>
      </ImageDialog>
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Download statement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["All time", {}],
              ["This month", monthRange(0)],
              ["Last month", monthRange(-1)],
              ["Last 30 days", { from: iso(addDays(new Date(), -29)), to: iso(new Date()) }],
            ] as [string, Range][]).map(([label, r]) => (
              <Button key={label} variant="outline" onClick={() => savePdf(r)}>{label}</Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={range.from ?? ""} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))} aria-label="From date" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={range.to ?? ""} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))} aria-label="To date" />
          </div>
          <Button className="w-full" onClick={() => savePdf(range)}>Download selected period</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
