import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileDown, MessageCircle, Phone, Share2, Trash2, Pencil } from "lucide-react";
import { DueBadge } from "@/components/DueBadge";
import { Label } from "@/components/ui/label";
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
import { ShareDialog, shareNative } from "@/components/ShareDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { balanceText, labels, receiptMessage, useEntries, useParty, useProfile, type Entry } from "@/lib/ledger";
import { fmtDate, fmtTime, inr, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { downloadStatement, type Range } from "@/lib/pdf";
import { Dialog as ImageDialog, DialogContent as ImageDialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { EntryDetailSheet, BubblePhoto } from "@/components/EntryDetailSheet";

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
  const { t } = useI18n();
  const { data: profile } = useProfile(session?.user.id);
  const { data: party, isLoading } = useParty(id);
  const { data: entries } = useEntries(id);
  const [dir, setDir] = useState<"gave" | "got" | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [del, setDel] = useState<Entry | "party" | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [range, setRange] = useState<Range>({});
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editParty, setEditParty] = useState(false);
  const [pf, setPf] = useState({ name: "", phone: "", email: "", note: "" });
  const [detail, setDetail] = useState<(Entry & { running: number }) | null>(null);
  const [filter, setFilter] = useState<"all" | "this" | "last">("all");

  // If this is a shared ledger, also load the owner's profile (the supplier) so the customer can get their UPI ID
  const { data: ownerProfile } = useProfile(party?.shared ? party.user_id : undefined);

  const rows = useMemo(() => {
    let run = 0;
    return (entries ?? []).map((e) => {
      run += e.direction === "gave" ? e.amount : -e.amount;
      return { ...e, running: run };
    });
  }, [entries]);

  const groups = useMemo(() => {
    const r = filter === "all" ? null : monthRange(filter === "this" ? 0 : -1);
    const m = new Map<string, typeof rows>();
    for (const e of rows) {
      const d = iso(new Date(e.entry_date));
      if (r && (d < r.from! || d > r.to!)) continue;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(e);
    }
    return [...m.entries()];
  }, [rows, filter]);

  const dayLabel = (d: string) => {
    if (d === iso(new Date())) return t("cs_today");
    if (d === iso(addDays(new Date(), -1))) return t("cs_yesterday");
    return fmtDate(d);
  };

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
  const dueDate = [...(entries ?? [])].reverse().find((e) => e.due_date)?.due_date ?? null;
  const reminder = receiptMessage({ business, party, balance: party.balance, upiId: profile?.upi_id, dueDate });

  // Supplier's UPI details for payment:
  // If customer is viewing shared supplier, payee is the supplier; otherwise it's the current user's UPI
  const payeeUpi = party.shared ? (ownerProfile?.upi_id || null) : profile?.upi_id;
  const payeeBusiness = party.shared ? (ownerProfile?.business_name || party.name) : (business ?? "LenaDena");

  const openEditParty = () => {
    setPf({ name: party.name, phone: party.phone ?? "", email: party.email ?? "", note: party.note ?? "" });
    setEditParty(true);
  };

  const saveParty = async () => {
    if (!pf.name.trim()) return void toast.error("Enter a name");
    const { error } = await supabase.from("parties").update({
      name: pf.name.trim(), phone: pf.phone.trim() || null, email: pf.email.trim() || null, note: pf.note.trim() || null,
    }).eq("id", party.id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["party", party.id] });
    qc.invalidateQueries({ queryKey: ["parties"] });
    setEditParty(false);
    toast.success("Details updated");
  };

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

  const savePdf = async (r: Range) => {
    try {
      await downloadStatement(party, entries ?? [], business, r);
      setPdfOpen(false);
      toast.success("Statement downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  };

  const kindLabel = party.kind === "customer" ? t("customer_label", "Customer") : t("supplier_label", "Supplier");

  // Determine if a selected entry is credit due:
  // On supplier screen: supplier gave credit -> e.direction === "gave" is due (Red)
  // On customer screen: customer received credit -> e.direction === "got" is due (Red)
  const isDetailCreditDue = detail ? (party.shared ? detail.direction === "got" : detail.direction === "gave") : false;

  // Show Payment QR only to the debtor (the customer who owes the money):
  // - If viewing as a customer in a shared khata (party.shared && isDetailCreditDue): true
  // - If viewing your supplier in your own ledger (party.kind === "supplier" && isDetailCreditDue): true
  // - If viewing your customer as a merchant: FALSE (supplier doesn't pay customer)
  const shouldShowPayInDetail = isDetailCreditDue && (party.shared || party.kind === "supplier");

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
            <p className="text-xs opacity-75 capitalize">{kindLabel}{party.phone ? ` · ${party.phone}` : ""}</p>
          </div>
          {party.phone && (
            <a href={`tel:${party.phone}`} className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Call">
              <Phone className="h-5 w-5" />
            </a>
          )}
          {!party.shared && (
            <button onClick={openEditParty} className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Edit details">
              <Pencil className="h-5 w-5" />
            </button>
          )}
          {!party.shared && (
            <button onClick={() => setDel("party")} className="grid place-items-center h-10 w-10 rounded-full bg-primary-foreground/10" aria-label="Delete party">
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-card text-card-foreground p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{balanceText(party.balance)}</p>
            <p className={cn("text-3xl font-extrabold font-display", party.balance > 0 ? "text-gain" : party.balance < 0 ? "text-loss" : "")}>
              {inr(party.balance)}
            </p>
            <DueBadge due={dueDate} balance={party.balance} className="mt-1" />
          </div>

          {/* Unified Actions: 1 Reminder button (opens WhatsApp/SMS picker) + PDF + Native Share */}
          <div className="flex gap-2">
            <Button
              size="icon"
              className="h-11 w-11 rounded-full bg-whatsapp hover:bg-whatsapp/90 text-gain-foreground"
              onClick={() => setRemindOpen(true)}
              aria-label="Send WhatsApp or SMS reminder"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full"
              aria-label="Download PDF"
              onClick={() => setPdfOpen(true)}
            >
              <FileDown className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full"
              onClick={() => shareNative(reminder)}
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 flex gap-2">
        {([["all", t("cs_all")], ["this", t("cs_this_month")], ["last", t("cs_last_month")]] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground")}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="mt-2 px-3 space-y-2">
        {groups.length === 0 && <p className="text-center text-muted-foreground py-12">{t("no_entries_yet", "No entries yet. Add the first one below.")}</p>}
        {groups.map(([day, list]) => (
          <section key={day} className="space-y-2">
            <div className="flex justify-center py-1">
              <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">{dayLabel(day)}</span>
            </div>
            {list.map((e) => {
              // Credit due is Red on both sides; Payment is Green
              const isCredit = party.shared ? e.direction === "got" : e.direction === "gave";
              return (
                <div key={e.id} className={cn("flex flex-col", isCredit ? "items-start" : "items-end")}>
                  <button
                    onClick={() => setDetail(e)}
                    className={cn(
                      "w-[72%] rounded-2xl border p-3 text-left shadow-sm",
                      isCredit ? "rounded-tl-sm bg-card border-loss/20" : "rounded-tr-sm bg-gain/10 border-gain/30"
                    )}
                  >
                    <p className="text-[10px] text-muted-foreground">
                      {party.shared ? `${t("cs_added_by")} ${party.name}` : t("cs_added_by_you")}
                    </p>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("text-lg font-bold", isCredit ? "text-loss" : "text-gain")}>
                        {isCredit ? "↑" : "↓"} {inr(e.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{fmtTime(e.entry_date)}</span>
                    </div>
                    {e.note && <p className="text-xs text-muted-foreground truncate">{e.note}</p>}
                    {e.due_date && isCredit && (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 mt-0.5">
                        ⏱ {t("promised_by", "Promised by")} {fmtDate(e.due_date)}
                      </p>
                    )}
                    {e.bill_path && <BubblePhoto path={e.bill_path} label={t("view_bill_photo", "View bill photo")} />}
                  </button>
                  <span className="mt-0.5 px-1 text-[11px] text-muted-foreground">
                    {inr(Math.abs(e.running))} {e.running > 0 ? t("cs_due") : e.running < 0 ? t("cs_advance") : t("cs_settled")}
                  </span>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <EntryDetailSheet
        entry={detail}
        onClose={() => setDetail(null)}
        partyName={party.name}
        phone={party.phone}
        business={payeeBusiness}
        upiId={payeeUpi}
        canEdit={!party.shared}
        gaveLabel={l.gave}
        gotLabel={l.got}
        isCreditDue={isDetailCreditDue}
        showPay={shouldShowPayInDetail}
        message={detail ? receiptMessage({ business, party, entry: detail, balance: detail.running, upiId: profile?.upi_id }) : ""}
        onEdit={() => { if (detail) { setEditEntry(detail); setDetail(null); } }}
        onDelete={() => { if (detail) { setDel(detail); setDetail(null); } }}
        onViewPhoto={(u) => setImageToView(u)}
      />

      <ShareDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        text={reminder}
        phone={party.phone}
        title="Send Reminder"
      />

      {party.shared ? (
        <p className="fixed bottom-0 inset-x-0 bg-secondary text-center text-sm text-muted-foreground p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {t("shared_by_prefix", "Shared by")} {party.name} · {t("updates_live", "updates live")}
        </p>
      ) : (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button className="h-14 text-base bg-loss hover:bg-loss/90 text-loss-foreground" onClick={() => setDir("gave")}>
              {l.gave} ₹
            </Button>
            <Button className="h-14 text-base bg-gain hover:bg-gain/90 text-gain-foreground" onClick={() => setDir("got")}>
              {l.got} ₹
            </Button>
          </div>
        </div>
      )}

      <EntrySheet
        open={!!dir || !!editEntry}
        onOpenChange={(o) => { if (!o) { setDir(null); setEditEntry(null); } }}
        party={party}
        direction={editEntry?.direction ?? dir ?? "got"}
        edit={editEntry}
        onSaved={(entry, bal) => { if (!editEntry) setShare(receiptMessage({ business, party, entry, balance: bal })); }}
      />

      <Dialog open={editParty} onOpenChange={setEditParty}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit {kindLabel} details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label htmlFor="pf-name">Name</Label><Input id="pf-name" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="pf-phone">Mobile</Label><Input id="pf-phone" inputMode="tel" value={pf.phone} onChange={(e) => setPf({ ...pf, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="pf-email">Email</Label><Input id="pf-email" type="email" value={pf.email} onChange={(e) => setPf({ ...pf, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="pf-note">Note</Label><Input id="pf-note" value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} /></div>
            <Button className="w-full" onClick={saveParty}>{t("save", "Save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
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
                <a href={imageToView} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary underline font-normal">
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
          <DialogHeader><DialogTitle>{t("download_statement", "Download statement")}</DialogTitle></DialogHeader>
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
